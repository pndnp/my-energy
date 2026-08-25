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

// DTO ответа GET /api/analytics (см. backend/src/modules/analytics/analytics.ts)
interface AnalyticsSummary {
  averages: { energy: number; mood: number; wellbeing: number; stress: number };
  loggedDays: number;
  periodDays: number;
}

interface AnalyticsDay {
  date: string;
  energy: number;
}

interface AnalyticsResponse {
  summary: AnalyticsSummary | null;
  timeSeries: Record<string, number | string>[];
  bestDays: AnalyticsDay[];
  worstDays: AnalyticsDay[];
}

function toDateParam(d: Date): string {
  return d.toISOString().split("T")[0];
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
function Summary({ summary }: { summary: AnalyticsSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Средние значения</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
            <div className="text-xs text-blue-600 dark:text-blue-400">⚡ Энергия</div>
            <div className="mt-1 text-2xl font-bold">{summary.averages.energy}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/20">
            <div className="text-xs text-slate-600 dark:text-slate-400">🙂 Настроение</div>
            <div className="mt-1 text-2xl font-bold">{summary.averages.mood}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/20">
            <div className="text-xs text-slate-600 dark:text-slate-400">❤️ Самочувствие</div>
            <div className="mt-1 text-2xl font-bold">{summary.averages.wellbeing}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/20">
            <div className="text-xs text-slate-600 dark:text-slate-400">😵 Стресс</div>
            <div className="mt-1 text-2xl font-bold">{summary.averages.stress}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/20">
            <div className="text-xs text-gray-600 dark:text-gray-400">Заполнено</div>
            <div className="mt-1 text-2xl font-bold">
              {summary.loggedDays} из {summary.periodDays} дней
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Metrics Chart ───────────────────────────────── */
function MetricsChart({ timeSeries }: { timeSeries: Record<string, number | string>[] }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    energy: true,
    sleep: false,
    mood: false,
    wellbeing: false,
    stress: false,
  });

  const toggle = (key: string) => setEnabled((p) => ({ ...p, [key]: !p[key] }));

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
            <AreaChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickFormatter={(v) => {
                  const d = new Date(String(v));
                  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
                }}
              />
              <YAxis domain={[0, 6]} fontSize={12} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || payload?.length === 0) return null;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="mb-1 text-xs font-medium">
                        {new Date(String(payload[0].payload.date)).toLocaleDateString("ru-RU")}
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

/* ─── Best / Worst Days ───────────────────────────── */
function DayRanking({
  title,
  medals,
  days,
}: {
  title: string;
  medals: string[];
  days: AnalyticsDay[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {days.length === 0 && <p className="text-sm text-muted-foreground">Нет данных</p>}
          {days.map((day, i) => (
            <div
              key={day.date}
              className="flex items-center justify-between rounded-lg p-2 bg-muted/50"
            >
              <span className="text-sm">
                {medals[i]}{" "}
                {new Date(day.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </span>
              <span className="font-bold text-yellow-500">⚡ {day.energy}/5</span>
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
  const [period, setPeriod] = useState<PeriodType>(7);

  const { data: analytics, isPending } = useQuery({
    queryKey: ["analytics", period],
    queryFn: async () => {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - period);
      const res = await api.get("/analytics", {
        params: { from: toDateParam(from), to: toDateParam(to) },
      });
      return res.data as AnalyticsResponse;
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5">
      <div>
        <h1 className="text-2xl font-bold mb-3">Аналитика</h1>
        <PeriodSelector selected={period} onSelect={setPeriod} />
      </div>

      {isPending ? null : !analytics?.summary ? (
        <EmptyState />
      ) : (
        <>
          <Summary summary={analytics.summary} />
          <MetricsChart timeSeries={analytics.timeSeries} />
          <div className="grid gap-6 md:grid-cols-2">
            <DayRanking title="Лучшие дни" medals={["🥇", "🥈", "🥉"]} days={analytics.bestDays} />
            <DayRanking title="Худшие дни" medals={["🥉", "🥈", "🥇"]} days={analytics.worstDays} />
          </div>
        </>
      )}
    </div>
  );
}

export { AnalyticsPage };
