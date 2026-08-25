/**
 * Аналитика: чистые TS-функции расчёта статистики по дневниковым логам.
 *
 * Единственный источник аналитической логики:
 *  - GET /api/analytics — отдаёт страницу «Аналитика» (summary, timeSeries, best/worst days)
 *  - AI-модуль (context-builder) — строит контекст для LLM (включая связи с энергией,
 *    которые в UI не показываются, но обязательны для промпта по ai-insights spec)
 */

// Лог в виде, который понимают расчёты. Совместимо и с @prisma/client DailyLog,
// и с DailyLogResponse (date: "YYYY-MM-DD" строкой).
export interface LogLike {
  date: string | Date;
  sleep: number;
  nutrition: number;
  caffeine: number;
  alcohol: number;
  activity: number;
  mood: number;
  wellbeing: number;
  stress: number;
  energy: number;
}

export interface SummaryDTO {
  averages: {
    energy: number;
    mood: number;
    wellbeing: number;
    stress: number;
  };
  loggedDays: number;
  periodDays: number;
}

export interface TimeSeriesPointDTO {
  date: string; // YYYY-MM-DD
  energy: number;
  sleep: number;
  mood: number;
  wellbeing: number;
  stress: number;
}

export interface DayDTO {
  date: string; // YYYY-MM-DD
  energy: number;
}

export interface AnalyticsResponseDTO {
  summary: SummaryDTO | null; // null, если за период нет ни одного лога
  timeSeries: TimeSeriesPointDTO[];
  bestDays: DayDTO[]; // top-3 по энергии (desc)
  worstDays: DayDTO[]; // bottom-3 по энергии (asc)
}

export interface RelationshipResult {
  metric: string;
  emoji: string;
  highThreshold: number;
  lowThreshold: number;
  highAvgEnergy: number | null;
  lowAvgEnergy: number | null;
}

// Числовые метрики (без energy и date)
export type MetricKey = "sleep" | "nutrition" | "caffeine" | "alcohol" | "activity" | "mood" | "wellbeing" | "stress";

const METRICS: { key: MetricKey; label: string; emoji: string }[] = [
  { key: "sleep", label: "Сон", emoji: "😴" },
  { key: "nutrition", label: "Питание", emoji: "🥗" },
  { key: "caffeine", label: "Кофе / чай", emoji: "☕" },
  { key: "alcohol", label: "Алкоголь", emoji: "🍷" },
  { key: "activity", label: "Активность", emoji: "🏃" },
  { key: "mood", label: "Настроение", emoji: "🙂" },
  { key: "wellbeing", label: "Самочувствие", emoji: "❤️" },
  { key: "stress", label: "Стресс", emoji: "😵" },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Нормализует дату лога к "YYYY-MM-DD" */
function toDateString(d: string | Date): string {
  return d instanceof Date ? d.toISOString().split("T")[0] : d;
}

function avgOf(logs: LogLike[], key: "energy" | "mood" | "wellbeing" | "stress"): number {
  return round1(logs.reduce((s, l) => s + l[key], 0) / logs.length);
}

/** Средние значения и заполненность периода */
export function computeSummary(logs: LogLike[], periodDays: number): SummaryDTO {
  return {
    averages: {
      energy: avgOf(logs, "energy"),
      mood: avgOf(logs, "mood"),
      wellbeing: avgOf(logs, "wellbeing"),
      stress: avgOf(logs, "stress"),
    },
    loggedDays: logs.length,
    periodDays,
  };
}

/** Точки для мульти-графика (только метрики, отображаемые на графике) */
export function computeTimeSeries(logs: LogLike[]): TimeSeriesPointDTO[] {
  return [...logs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((l) => ({
      date: toDateString(l.date),
      energy: l.energy,
      sleep: l.sleep,
      mood: l.mood,
      wellbeing: l.wellbeing,
      stress: l.stress,
    }));
}

/** Top-3 дня с наивысшей энергией */
export function computeBestDays(logs: LogLike[]): DayDTO[] {
  return [...logs]
    .sort((a, b) => b.energy - a.energy)
    .slice(0, 3)
    .map((l) => ({ date: toDateString(l.date), energy: l.energy }));
}

/** Top-3 дня с наименьшей энергией */
export function computeWorstDays(logs: LogLike[]): DayDTO[] {
  return [...logs]
    .sort((a, b) => a.energy - b.energy)
    .slice(0, 3)
    .map((l) => ({ date: toDateString(l.date), energy: l.energy }));
}

/**
 * Связи с энергией: разбивка каждого показателя по порогу 4 (≥ 4 vs < 4)
 * и средняя энергия в каждой группе. В UI не показывается; используется
 * для контекста LLM (ai-insights spec: backend-driven analytics aggregation).
 */
export function computeRelationships(logs: LogLike[]): RelationshipResult[] {
  const results: RelationshipResult[] = [];
  for (const m of METRICS) {
    const high = logs.filter((l) => l[m.key] >= 4);
    const low = logs.filter((l) => l[m.key] < 4);
    if (high.length === 0 || low.length === 0) continue;
    results.push({
      metric: m.label,
      emoji: m.emoji,
      highThreshold: 4,
      lowThreshold: 4,
      highAvgEnergy: round1(high.reduce((s, l) => s + l.energy, 0) / high.length),
      lowAvgEnergy: round1(low.reduce((s, l) => s + l.energy, 0) / low.length),
    });
  }
  return results;
}

/** Полный ответ для GET /api/analytics */
export function computeAnalyticsResponse(
  logs: LogLike[],
  periodDays: number,
): AnalyticsResponseDTO {
  if (logs.length === 0) {
    return { summary: null, timeSeries: [], bestDays: [], worstDays: [] };
  }
  return {
    summary: computeSummary(logs, periodDays),
    timeSeries: computeTimeSeries(logs),
    bestDays: computeBestDays(logs),
    worstDays: computeWorstDays(logs),
  };
}
