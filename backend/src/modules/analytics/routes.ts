import { Router, type Response } from "express";
import prisma from "../../db/index.js";
import { authMiddleware, type AuthRequest } from "../../middleware/auth.js";
import { computeAnalyticsResponse } from "./analytics.js";

const router = Router();

// Все роуты модуля требуют авторизации
router.use(authMiddleware);

/**
 * GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Единая точка аналитики: summary (средние + fill rate), timeSeries (график),
 * best/worst days. Расчёты — на бэкенде, один запрос вместо сырых логов.
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: { code: "VALIDATION_ERROR", message: "Both 'from' and 'to' query parameters are required" } });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res
        .status(400)
        .json({ error: { code: "VALIDATION_ERROR", message: "'from' and 'to' must be valid dates" } });
    }

    // periodDays — длина окна для fill rate «X из N дней»
    const periodDays = Math.max(
      1,
      Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1,
    );

    const logs = await prisma.dailyLog.findMany({
      where: {
        userId,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: { date: "asc" },
    });

    res.json(computeAnalyticsResponse(logs, periodDays));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
});

export default router;
