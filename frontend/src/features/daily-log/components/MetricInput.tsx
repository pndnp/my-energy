import { cn } from "@/lib/utils";

export interface MetricConfig {
  key: string;
  label: string;
  emoji: string;
}

const METRICS: MetricConfig[] = [
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

export const metricConfigs = METRICS;

interface MetricInputProps {
  config: MetricConfig;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

function valueColor(value: number): string {
  if (value >= 4) return "bg-blue-500 border-blue-500 text-white ring-2 ring-blue-300";
  if (value === 3) return "bg-blue-400 border-blue-400 text-white ring-2 ring-blue-300/50";
  return "bg-blue-300 border-blue-300 text-blue-900 ring-2 ring-blue-200";
}

function MetricInput({ config, value, onChange, className }: MetricInputProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-3 transition-colors hover:bg-muted/50",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          <span className="mr-1 text-base">{config.emoji}</span>
          {config.label}
        </span>
        <span
          className={cn(
            "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-sm font-bold transition-all",
            valueColor(value),
          )}
        >
          {value}
        </span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((num) => {
          const checked = num === value;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={cn(
                "flex flex-1 items-center justify-center rounded-md border text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                checked
                  ? `border-transparent ${valueColor(num)}`
                  : "border-border bg-background hover:border-border/80 hover:bg-muted",
              )}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { MetricInput };
