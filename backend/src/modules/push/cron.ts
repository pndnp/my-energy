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
  cron.schedule(
    "0 20 * * *",
    () => {
      void service.runDailyReminder().catch((err: unknown) => {
        console.error("[push] daily reminder failed:", err);
      });
    },
    { name: "daily-log-reminder", timezone: "Europe/Moscow", noOverlap: true },
  );
  scheduled = true;
  console.log("[push] daily reminder cron scheduled: 0 20 * * * (Europe/Moscow)");
}
