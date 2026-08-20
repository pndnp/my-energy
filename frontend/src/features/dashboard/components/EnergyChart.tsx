import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyLog } from "@/types/daily-log";

interface EnergyChartProps {
  logs: DailyLog[];
}

function EnergyChart({ logs }: EnergyChartProps) {
  const chartData = useMemo(() => {
    return logs
      .slice(0, 7)
      .reverse()
      .map((log) => ({
        date: log.date,
        energy: log.energy,
        sleep: log.sleep,
        mood: log.mood,
      }));
  }, [logs]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Энергия за последние 7 дней</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const d = new Date(value);
                  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
                }}
                fontSize={12}
              />
              <YAxis domain={[0, 6]} fontSize={12} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const data = payload[0].payload as (typeof chartData)[0];
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="text-xs font-medium">{data.date}</div>
                      <div className="text-xs text-yellow-500">⚡ Энергия: {data.energy}</div>
                      <div className="text-xs text-blue-500">😴 Сон: {data.sleep}</div>
                      <div className="text-xs text-green-500">🙂 Настроение: {data.mood}</div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="energy"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="sleep"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export { EnergyChart };
