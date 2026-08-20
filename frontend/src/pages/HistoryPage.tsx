import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DailyLogForm } from "@/features/daily-log/components/DailyLogForm";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DailyLog } from "@/types/daily-log";

function getEnergyColor(value: number): string {
  if (value >= 4) return "text-green-500";
  if (value === 3) return "text-yellow-500";
  return "text-red-500";
}

function getDotColor(energy: number): string {
  if (energy >= 4) return "bg-yellow-500";
  if (energy === 3) return "bg-yellow-400";
  return "bg-yellow-300";
}

function CalendarMonth({
  currentDate,
  selectedDate,
  logs,
  onSelect,
}: {
  currentDate: Date;
  selectedDate: string | null;
  logs: DailyLog[];
  onSelect: (date: string) => void;
}) {
  const [localDate, setLocalDate] = useState(currentDate);

  // Build lookup map of date -> energy for quick access
  const energyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) {
      map.set(log.date, log.energy);
    }
    return map;
  }, [logs]);

  const year = localDate.getFullYear();
  const month = localDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust for Monday start (Russian calendar)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const monthName = localDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalDate(new Date(year, month - 1, 1))}
          >
            ←
          </Button>
          <CardTitle className="capitalize">{monthName}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalDate(new Date(year, month + 1, 1))}
          >
            →
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 text-center">
          {weekdays.map((day) => (
            <div key={day} className="text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: adjustedFirstDay }, (_, blankPos) => (
            <div key={blankPos} />
          ))}
          {Array.from({ length: daysInMonth }, (_, dayIndex) => dayIndex + 1).map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = dateStr === selectedDate;
            const energy = energyMap.get(dateStr);
            const hasData = energy !== undefined;

            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelect(dateStr)}
                className={cn(
                  "relative flex h-9 flex-col items-center justify-center rounded-lg text-sm transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <span>{day}</span>
                {hasData && (
                  <span
                    className={cn("mt-px size-1.5 shrink-0 rounded-full", getDotColor(energy))}
                  />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DayList({
  logs,
  selectedDate,
  onSelect,
}: {
  logs: DailyLog[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const topLogs = logs.slice(0, 10);

  if (topLogs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Нет записей в этом периоде</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Недавние дни</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topLogs.map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => onSelect(log.date)}
              className={`flex w-full items-center justify-between rounded-lg p-3 transition-colors ${
                log.date === selectedDate ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <span className="text-sm">
                {new Date(log.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </span>
              <span className={`font-bold ${getEnergyColor(log.energy)}`}>⚡ {log.energy}/5</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: logs } = useQuery({
    queryKey: ["dailyLogs", "history"],
    queryFn: async () => {
      const from = thirtyDaysAgo.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];
      const res = await api.get("/daily-logs", { params: { from, to } });
      return res.data as DailyLog[];
    },
  });

  const sortedLogs =
    logs?.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5">
      <h1 className="text-2xl font-bold">История</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <CalendarMonth
          currentDate={today}
          selectedDate={selectedDate}
          logs={sortedLogs}
          onSelect={(date) => setSelectedDate(date)}
        />
        <DayList
          logs={sortedLogs}
          selectedDate={selectedDate}
          onSelect={(date) => setSelectedDate(date)}
        />
      </div>

      <Separator />

      {selectedDate ? (
        <DailyLogForm key={selectedDate} date={selectedDate} />
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Выберите день в календаре или списке
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { HistoryPage };
