import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

interface Insight {
  type: string;
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

interface Experiment {
  title: string;
  description: string;
}

interface AiInsightsResponse {
  insights: Insight[];
  experiment: Experiment;
}

function ConfidenceBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_COLORS[level] || "bg-gray-100 text-gray-800"}`}
    >
      {CONFIDENCE_LABELS[level] || level}
    </span>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const emojiMap: Record<string, string> = {
    sleep: "😴",
    nutrition: "🥗",
    caffeine: "☕",
    alcohol: "🍷",
    activity: "🏃",
    mood: "🙂",
    wellbeing: "❤️",
    stress: "😵",
    energy: "⚡",
  };

  const emoji = emojiMap[insight.type] || "🔍";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <CardTitle className="text-base">{insight.title}</CardTitle>
          </div>
          <ConfidenceBadge level={insight.confidence} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{insight.description}</p>
      </CardContent>
    </Card>
  );
}

function ExperimentCard({ experiment }: { experiment: Experiment }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span>🧪</span>
          {experiment.title}
        </CardTitle>
        <CardDescription>Предлагаемый эксперимент</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{experiment.description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <p className="text-muted-foreground">Недостаточно данных для выводов на данный момент</p>
        <p className="mt-2 text-sm">Заполняйте дневные записи, чтобы начать получать наблюдения</p>
      </CardContent>
    </Card>
  );
}

function AInsightsPage() {
  const { data, isLoading, refetch } = useQuery<AiInsightsResponse>({
    queryKey: ["aiInsights"],
    queryFn: async () => {
      const res = await api.get("/ai/insights");
      return res.data;
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      await api.post("/ai/insights/regenerate");
    },
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-5">
        <h1 className="text-2xl font-bold">AI Наблюдения</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.insights || data.insights.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">AI Наблюдения</h1>
          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
          >
            {regenerateMutation.isPending ? "Генерация..." : "Обновить"}
          </Button>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Наблюдения</h1>
        <Button onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending}>
          {regenerateMutation.isPending ? "Генерация..." : "Обновить"}
        </Button>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Наблюдения</h2>
        <div className="space-y-3">
          {data.insights.map((insight) => (
            <InsightCard key={insight.type + insight.title} insight={insight} />
          ))}
        </div>
      </section>

      <Separator />

      <section>
        <ExperimentCard experiment={data.experiment} />
      </section>
    </div>
  );
}

export { AInsightsPage };
