import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailyLogMutation, useDailyLogQuery } from "@/features/daily-log/hooks";
import type { CreateDailyLogInput, PartialUpdate } from "@/types/daily-log";
import { MetricInput, metricConfigs } from "./MetricInput";

interface DailyLogFormProps {
  date: string; // YYYY-MM-DD
  onSuccess?: () => void;
}

function DailyLogForm({ date, onSuccess }: DailyLogFormProps) {
  const [values, setValues] = useState<CreateDailyLogInput>({
    date,
    sleep: 1,
    nutrition: 1,
    caffeine: 1,
    alcohol: 1,
    activity: 1,
    mood: 1,
    wellbeing: 1,
    stress: 1,
    energy: 1,
  });
  const [originalValues, setOriginalValues] = useState<CreateDailyLogInput>({
    date,
    sleep: 1,
    nutrition: 1,
    caffeine: 1,
    alcohol: 1,
    activity: 1,
    mood: 1,
    wellbeing: 1,
    stress: 1,
    energy: 1,
  });

  const { data: existingLog, isLoading } = useDailyLogQuery(date);
  const mutation = useDailyLogMutation(date, onSuccess);

  // Sync values when existingLog or date changes
  useEffect(() => {
    if (existingLog) {
      const restored = {
        date: existingLog.date,
        sleep: existingLog.sleep,
        nutrition: existingLog.nutrition,
        caffeine: existingLog.caffeine,
        alcohol: existingLog.alcohol,
        activity: existingLog.activity,
        mood: existingLog.mood,
        wellbeing: existingLog.wellbeing,
        stress: existingLog.stress,
        energy: existingLog.energy,
      };
      setValues(restored);
      setOriginalValues(restored);
    } else {
      const defaults: CreateDailyLogInput = {
        date,
        sleep: 1,
        nutrition: 1,
        caffeine: 1,
        alcohol: 1,
        activity: 1,
        mood: 1,
        wellbeing: 1,
        stress: 1,
        energy: 1,
      };
      setValues(defaults);
      setOriginalValues(defaults);
    }
  }, [existingLog, date]);

  const handleValueChange = (key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = JSON.stringify(values) !== JSON.stringify(originalValues);

  const handleSave = async () => {
    try {
      if (existingLog) {
        // Update — only send changed fields
        const updateData: PartialUpdate = {};
        for (const key of Object.keys(values)) {
          if (key !== "date") {
            (updateData as Record<string, unknown>)[key] = values[key as keyof CreateDailyLogInput];
          }
        }
        await mutation.mutateAsync({
          isUpdate: true,
          data: updateData,
          date,
        });
      } else {
        // Create
        await mutation.mutateAsync({
          isUpdate: false,
          data: values,
          date,
        });
      }
      // Reset original values to match saved state
      setOriginalValues({ ...values });
    } catch (err) {
      console.error("Failed to save daily log:", err);
    }
  };

  const handleCancel = () => {
    setValues(originalValues);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            {metricConfigs.map((config) => (
              <div key={config.key} className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>
          {new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metricConfigs.map((config) => (
          <MetricInput
            key={config.key}
            config={config}
            value={values[config.key as keyof CreateDailyLogInput] as number}
            onChange={(val) => handleValueChange(config.key, val)}
          />
        ))}

        <div className="flex gap-2 pt-2">
          {hasChanges ? (
            <>
              <Button onClick={handleSave} disabled={mutation.isPending}>
                {mutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button variant="secondary" onClick={handleCancel} disabled={mutation.isPending}>
                Отмена
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Нет изменений</p>
          )}
        </div>

        {/* Show success/error message */}
        {mutation.isSuccess && !mutation.isPending && (
          <p className="text-sm text-green-600 font-medium">Успешно сохранено!</p>
        )}
        {mutation.isError && (
          <p className="text-sm text-red-600 font-medium">Ошибка при сохранении</p>
        )}
      </CardContent>
    </Card>
  );
}

export { DailyLogForm };
