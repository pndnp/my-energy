import dotenv from "dotenv";

dotenv.config();

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";

const app = express();

// FRONTEND_URL — для CORS (разрешить запросы от фронтенда)
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Auth routes
import authRoutes from "./modules/auth/routes.js";

app.use("/api/auth", authRoutes);

import { authMiddleware } from "./middleware/auth.js";
// Daily logs routes (with auth middleware)
import dailyLogsRoutes from "./modules/daily-logs/routes.js";

app.use("/api/daily-logs", authMiddleware, dailyLogsRoutes);

// Analytics routes (with auth middleware)
import analyticsRoutes from "./modules/analytics/routes.js";

app.use("/api/analytics", analyticsRoutes);

// AI Insights routes (with auth middleware)
import { getInsights, regenerateInsights } from "./modules/ai/routes.js";

app.get("/api/ai/insights", authMiddleware, getInsights);
app.post("/api/ai/insights/regenerate", authMiddleware, regenerateInsights);

import { startDailyReminderCron } from "./modules/push/cron.js";
// Push subscriptions routes (with auth middleware)
import pushRoutes from "./modules/push/routes.js";

app.use("/api/push-subscriptions", authMiddleware, pushRoutes);
startDailyReminderCron();

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: unknown) => {
  console.error(err.stack);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
