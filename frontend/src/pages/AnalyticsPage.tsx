import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import type { DailyLog } from "@/types/daily-log";

const PERIODS = [
  { label: "7 дней", days: 7 },
  { label: "14 дней", days: 14 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
] as const;

type PeriodType = (typeof PERIODS)[number]["days"];

const metricConfigs = [
  { key: "energy", label: "Энергия", emoji: "⚡" },
  { key: "sleep", label: "Сон", emoji: "😴" },
  { key: "mood", label: "Настроение", emoji: "🙂" },
  { key: "wellbeing", label: "Самочувствие", emoji: "❤️" },
  { key: "stress", label: "Стресс", emoji: "😵" },
] as const;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/* ─── Period Selector ─────────────────────────────── */
function PeriodSelector({
  selected,
  onSelect,
}: {
  selected: PeriodType;
  onSelect: (d: PeriodType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((p) => (
        <Button
          key={p.days}
          variant={selected === p.days ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(p.days)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}

/* ─── Summary ─────────────────────────────────────── */
function Summary({ logs, periodDays }: { logs: DailyLog[]; periodDays: PeriodType }) {
  if (logs.length === 0) {
    return <EmptyState />;
  }

  const avgEnergy = round1(logs.reduce((s, l) => s + l.energy, 0) / logs.length);
  const avgMood = round1(logs.reduce((s, l) => s + l.mood, 0) / logs.length);
  const avgWellbeing = round1(logs.reduce((s, l) => s + l.wellbeing, 0) / logs.length);
  const avgStress = round1(logs.reduce((s, l) => s + l.stress, 0) / logs.length);
  const fillRate = `${logs.length} из ${periodDays} дней`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Средние значения</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
            <div className="text-xs text-blue-600 dark:text-blue-400">⚡ Энергия</div>
            <div className="mt-1 text-2xl font-bold">{avgEnergy}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/20">
            <div className="text-xs text-slate-600 dark:text-slate-400">🙂 Настроение</div>
            <div className="mt-1 text-2xl font-bold">{avgMood}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/20">
            <div className="text-xs text-slate-600 dark:text-slate-400">❤️ Самочувствие</div>
            <div className="mt-1 text-2xl font-bold">{avgWellbeing}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/20">
            <div className="text-xs text-slate-600 dark:text-slate-400">😵 Стресс</div>
            <div className="mt-1 text-2xl font-bold">{avgStress}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/20">
            <div className="text-xs text-gray-600 dark:text-gray-400">Заполнено</div>
            <div className="mt-1 text-2xl font-bold">{fillRate}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Metrics Chart ───────────────────────────────── */
function MetricsChart({ logs }: { logs: DailyLog[] }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    energy: true,
    sleep: false,
    mood: false,
    wellbeing: false,
    stress: false,
  });

  const toggle = (key: string) => setEnabled((p) => ({ ...p, [key]: !p[key] }));

  const chartData = [...logs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((l) => ({
      date: l.date,
      energy: l.energy,
      sleep: l.sleep,
      mood: l.mood,
      wellbeing: l.wellbeing,
      stress: l.stress,
    }));

  const colors: Record<string, string> = {
    energy: "#f59e0b",
    sleep: "#3b82f6",
    mood: "#22c55e",
    wellbeing: "#ef4444",
    stress: "#8b5cf6",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Графики показателей</CardTitle>
        <div className="flex flex-wrap gap-2 mt-1">
          {metricConfigs.map((m) => (
            <Button
              key={m.key}
              variant={enabled[m.key] ? "default" : "outline"}
              size="xs"
              onClick={() => toggle(m.key)}
            >
              {m.emoji} {m.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
                }}
              />
              <YAxis domain={[0, 6]} fontSize={12} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="mb-1 text-xs font-medium">
                        {new Date(payload[0].payload.date).toLocaleDateString("ru-RU")}
                      </div>
                      {payload.map((e) => (
                        <div key={String(e.name)} className="text-xs" style={{ color: e.color }}>
                          {e.name}: {e.value}
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {Object.entries(enabled)
                .filter(([, v]) => v)
                .map(([key]) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[key]}
                    fill={colors[key]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Energy Relationships ────────────────────────── */
interface RelationRow {
  metricLabel: string;
  emoji: string;
  highAvg: number;
  lowAvg: number;
}

function analyzeRelationships(logs: DailyLog[]): RelationRow[] {
  const metrics: { key: keyof DailyLog; label: string; emoji: string }[] = [
    { key: "sleep", label: "Сон", emoji: "😴" },
    { key: "nutrition", label: "Питание", emoji: "🥗" },
    { key: "activity", label: "Активность", emoji: "🏃" },
    { key: "mood", label: "Настроение", emoji: "🙂" },
    { key: "wellbeing", label: "Самочувствие", emoji: "❤️" },
    { key: "stress", label: "Стресс", emoji: "😵" },
    { key: "caffeine", label: "Кофе/чай", emoji: "☕" },
    { key: "alcohol", label: "Алкоголь", emoji: "🍷" },
  ];

  return metrics
    .map(({ key, label, emoji }) => {
      const high = logs.filter((l) => (l[key] as number) >= 4);
      const low = logs.filter((l) => (l[key] as number) < 4);
      const highAvg =
        high.length > 0 ? round1(high.reduce((s, l) => s + l.energy, 0) / high.length) : null;
      const lowAvg =
        low.length > 0 ? round1(low.reduce((s, l) => s + l.energy, 0) / low.length) : null;
      return {
        metricLabel: label,
        emoji,
        highAvg,
        lowAvg,
      };
    })
    .filter((r) => r.highAvg !== null || r.lowAvg !== null);
}

function EnergyRelationships({ logs }: { logs: DailyLog[] }) {
  const relations = analyzeRelationships(logs);

  if (relations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Связи с энергией</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {relations.map((r) => (
            <div key={r.metricLabel} className="rounded-lg border p-3 space-y-1">
              <div className="font-medium">
                {r.emoji} {r.metricLabel}
              </div>
              {r.highAvg !== null && (
                <div className="text-sm text-muted-foreground">
                  {r.metricLabel} ≥ 4 → средняя энергия {r.highAvg}
                </div>
              )}
              {r.lowAvg !== null && (
                <div className="text-sm text-muted-foreground">
                  {r.metricLabel} &lt; 4 → средняя энергия {r.lowAvg}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Best / Worst Days ───────────────────────────── */
function DayRanking({
  title,
  medals,
  logs,
  direction,
}: {
  title: string;
  medals: string[];
  logs: DailyLog[];
  direction: "desc" | "asc";
}) {
  const ranked = [...logs]
    .sort((a, b) => (direction === "desc" ? b.energy - a.energy : a.energy - b.energy))
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ranked.length === 0 && <p className="text-sm text-muted-foreground">Нет данных</p>}
          {ranked.map((log, i) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-lg p-2 bg-muted/50"
            >
              <span className="text-sm">
                {medals[i]}{" "}
                {new Date(log.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </span>
              <span className="font-bold text-yellow-500">⚡ {log.energy}/5</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Empty State ─────────────────────────────────── */
function EmptyState() {
  return (
    <Card>
      <CardContent className="pt-6 text-center text-muted-foreground">
        Нет данных для выбранного периода
      </CardContent>
    </Card>
  );
}

/* ─── Page ────────────────────────────────────────── */
function AnalyticsPage() {
  const today = new Date();
  const [period, setPeriod] = useState<PeriodType>(30);

  const { data: logs } = useQuery({
    queryKey: ["dailyLogs", "analytics", period],
    queryFn: async () => {
      const start = new Date(today);
      start.setDate(start.getDate() - period);
      const from = start.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];
      const res = await api.get("/daily-logs", { params: { from, to } });
      return res.data as DailyLog[];
    },
  });

  const sortedLogs =
    logs?.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5">
      <div>
        <h1 className="text-2xl font-bold mb-3">Аналитика</h1>
        <PeriodSelector selected={period} onSelect={setPeriod} />
      </div>

      {sortedLogs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Summary logs={sortedLogs} periodDays={period} />
          <MetricsChart logs={sortedLogs} />
          <EnergyRelationships logs={sortedLogs} />
          <div className="grid gap-6 md:grid-cols-2">
            <DayRanking
              title="Лучшие дни"
              medals={["🥇", "🥈", "🥉"]}
              logs={sortedLogs}
              direction="desc"
            />
            <DayRanking
              title="Худшие дни"
              medals={["🥉", "🥈", "🥇"]}
              logs={sortedLogs}
              direction="asc"
            />
          </div>
        </>
      )}
    </div>
  );
}

export { AnalyticsPage };
