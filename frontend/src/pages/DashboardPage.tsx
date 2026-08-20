import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyLogForm } from "@/features/daily-log/components/DailyLogForm";
import { EnergyChart } from "@/features/dashboard/components/EnergyChart";
import api from "@/lib/api";
import type { DailyLog } from "@/types/daily-log";

const getTodayDate = () => new Date().toISOString().split("T")[0];

function TodayEnergy() {
  const today = getTodayDate();

  const { data: log, isLoading } = useQuery<DailyLog | null, Error>({
    queryKey: ["dailyLog", today],
    queryFn: async () => {
      try {
        const res = await api.get(`/daily-logs/${today}`);
        return res.data;
      } catch (err: unknown) {
        // If no log found, return null (not error)
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
  });

  const metricConfigs = [
    { key: "sleep", label: "Сон", emoji: "😴" },
    { key: "nutrition", label: "Питание", emoji: "🥗" },
    { key: "caffeine", label: "Кофе / чай", emoji: "☕" },
    { key: "alcohol", label: "Алкоголь", emoji: "🍷" },
    { key: "activity", label: "Активность", emoji: "🏃" },
    { key: "mood", label: "Настроение", emoji: "🙂" },
    { key: "wellbeing", label: "Самочувствие", emoji: "❤️" },
    { key: "stress", label: "Стресс", emoji: "😵" },
    { key: "energy", label: "Энергия", emoji: "⚡" },
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {metricConfigs.map((config) => (
          <div key={config.key} className="h-6 bg-muted rounded w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {log &&
        metricConfigs.map((config) => {
          const value = log[config.key as keyof DailyLog] as number;
          return (
            <Card key={config.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">{config.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {config.emoji} {value}/5
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}

function DashboardPage() {
  const today = getTodayDate();

  // Get last 7 days of logs for chart
  const { data: recentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["dailyLogs", "last7days"],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const from = startDate.toISOString().split("T")[0];
      const to = endDate.toISOString().split("T")[0];

      const res = await api.get("/daily-logs", { params: { from, to } });
      return res.data as DailyLog[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Энергия дня</h1>
        <p className="text-muted-foreground">
          {new Date(today).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Metrics + Form - two columns on lg+ */}
      <h2 className="text-lg font-semibold">Сегодня</h2>
      <section>
        {/* Today's energy overview */}
        <div className="space-y-3">
          <TodayEnergy />
        </div>

        {/* Daily log form */}
        <div className="space-y-3">
          <DailyLogForm date={today} />
        </div>
      </section>

      {/* Energy chart */}
      <section>
        {!logsLoading && recentLogs && recentLogs.length > 0 && <EnergyChart logs={recentLogs} />}
      </section>
    </div>
  );
}

export { DashboardPage };
