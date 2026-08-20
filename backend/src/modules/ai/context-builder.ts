import type { DailyLog } from "@prisma/client";

export interface AnalyticsContext {
  periodDays: number;
  fillRate: string;
  averages: Record<string, number>;
  energyRelationships: RelationshipResult[];
  bestDays: BestDay[];
}

export interface RelationshipResult {
  metric: string;
  emoji: string;
  highThreshold: number;
  lowThreshold: number;
  highAvgEnergy: number | null;
  lowAvgEnergy: number | null;
}

export interface BestDay {
  date: string;
  energy: number;
}

const METRICS = [
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

export function buildContext(logs: DailyLog[], periodDays: number): AnalyticsContext {
  const avg = (key: string) => round1(logs.reduce((s, l) => s + (l as any)[key], 0) / logs.length);
  const avgEnergy = round1(logs.reduce((s, l) => s + l.energy, 0) / logs.length);
  const avgMood = avg("mood");
  const avgWellbeing = avg("wellbeing");
  const avgStress = avg("stress");

  const relationships: RelationshipResult[] = [];
  for (const m of METRICS) {
    const high = logs.filter(l => (l as any)[m.key] >= 4);
    const low = logs.filter(l => (l as any)[m.key] < 4);
    if (high.length === 0 || low.length === 0) continue;
    relationships.push({
      metric: m.label,
      emoji: m.emoji,
      highThreshold: 4,
      lowThreshold: 4,
      highAvgEnergy: round1(high.reduce((s, l) => s + l.energy, 0) / high.length),
      lowAvgEnergy: round1(low.reduce((s, l) => s + l.energy, 0) / low.length),
    });
  }

  const sortedByEnergy = [...logs].sort((a, b) => b.energy - a.energy).slice(0, 3);
  const bestDays: BestDay[] = sortedByEnergy.map(l => ({
    date: l.date.toISOString().split("T")[0],
    energy: l.energy,
  }));

  return {
    periodDays,
    fillRate: `${logs.length} из ${periodDays}`,
    averages: { energy: avgEnergy, mood: avgMood, wellbeing: avgWellbeing, stress: avgStress },
    energyRelationships: relationships,
    bestDays,
  };
}

// Generate prompt with strict JSON schema enforcement
export function buildPrompt(context: AnalyticsContext): string {
  const relationsText = context.energyRelationships.map(r =>
    `${r.emoji} ${r.metric}: ≥4 → э${r.highAvgEnergy} / <4 → э${r.lowAvgEnergy}`
  ).join("\n");

  return `Ты — аналитик привычек и самочувствия. Ты НЕ делаешь медицинские выводы.
Работай ТОЛЬКО с предоставленными данными. Не выдумывай статистику.

## Данные за последние ${context.periodDays} дней
- Заполнено: ${context.fillRate} дней
- Средняя энергия: ${context.averages.energy}, Настроение: ${context.averages.mood}, Самочувствие: ${context.averages.wellbeing}, Стресс: ${context.averages.stress}

## Связи показателей с энергией
${relationsText || "(Нет достаточных данных для связей)"}

## Лучшие дни
${context.bestDays.map(d => `- ${d.date}: ⚡${d.energy}`).join("\n")}

## ТВОЯ ЗАДАЧА
Верни ТОЛЬКО JSON в формате:
\`\`\`json
{
  "insights": [
    {"type": "<ключ>", "title": "<короткий заголовок>", "description": "<описание наблюдения>", "confidence": "<high|medium|low>"}
  ],
  "experiment": {"title": "<название эксперимента>", "description": "<опиши эксперимент на следующую неделю>"}
}
\`\`\`

Ограничения:
- Максимум 5 наблюдений
- Каждое наблюдение основано НА РЕАЛЬНЫХ ДАННЫХ из выше
- Никогда не говори о причинах — только корреляциях ("в твоих данных...")
- Если мало данных (<7 дней): верни пустой insights [] и скажи "Недостаточно данных"
- confidence: "high" если n≥15, "medium" если 7-14, "low" если <7`}
