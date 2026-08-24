import cron from "node-cron";
import * as service from "./service.js";

let scheduled = false;

export function startDailyReminderCron() {
  if (scheduled) {
    return;
  }
  // Cron запускаем только в production — в dev напоминания триггерим вручную
  if (process.env.NODE_ENV !== "production") {
    console.log("[push] NODE_ENV is not 'production', daily reminder cron is disabled");
    return;
  }
  const schedule = process.env.DAILY_REMINDER_CRON ?? "0 20 * * *";
  if (!cron.validate(schedule)) {
    throw new Error(`Invalid DAILY_REMINDER_CRON expression: "${schedule}"`);
  }
  const timezone = service.getAppTimezone();
  cron.schedule(
    schedule,
    () => {
      void service.runDailyReminder().catch((err: unknown) => {
        console.error("[push] daily reminder failed:", err);
      });
    },
    { name: "daily-log-reminder", timezone, noOverlap: true },
  );
  scheduled = true;
  console.log(`[push] daily reminder cron scheduled: ${schedule} (${timezone})`);
}
