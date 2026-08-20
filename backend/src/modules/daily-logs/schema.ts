import { z } from "zod";

const METRIC_MIN = 1;
const METRIC_MAX = 5;

export const dailyLogSchema = z.object({
  date: z.string().datetime({ offset: true }).or(z.string().refine((val) => {
    // Accept YYYY-MM-DD format
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, { message: "Invalid date format" })),
  sleep: z.number().int().min(METRIC_MIN).max(METRIC_MAX),
  nutrition: z.number().int().min(METRIC_MIN).max(METRIC_MAX),
  caffeine: z.number().int().min(METRIC_MIN).max(METRIC_MAX),
  alcohol: z.number().int().min(METRIC_MIN).max(METRIC_MAX),
  activity: z.number().int().min(METRIC_MIN).max(METRIC_MAX),
  mood: z.number().int().min(METRIC_MIN).max(METRIC_MAX),
  wellbeing: z.number().int().min(METRIC_MIN).max(METRIC_MAX),
  stress: z.number().int().min(METRIC_MIN).max(METRIC_MAX),
  energy: z.number().int().min(METRIC_MIN).max(METRIC_MAX),
});

export const partialDailyLogSchema = dailyLogSchema.partial();

export type DailyLogInput = z.infer<typeof dailyLogSchema>;
export type PartialDailyLogInput = z.infer<typeof partialDailyLogSchema>;
