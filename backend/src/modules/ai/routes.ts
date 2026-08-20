import type { Response } from "express";
import * as service from "./insights-service.js";
import type { AuthRequest } from "../../middleware/auth.js";
import prisma from "../../db/index.js";

export const getInsights = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const periodDays = Number(req.query.period) || 30;
    const result = await service.generateInsights(userId, periodDays);
    return res.status(200).json({ ...result, lastGeneratedAt: result.lastGeneratedAt.toISOString() });
  } catch (err) {
    console.error("AI insights error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Ошибка генерации наблюдений" },
    });
  }
};

export const regenerateInsights = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const periodDays = Number(req.query.period) || 30;
    
    // Delete cached insights to force regeneration
    await prisma.aiInsight.deleteMany({
      where: { userId, periodDays },
    });
    
    const result = await service.generateInsights(userId, periodDays);
    return res.status(200).json(result);
  } catch (err) {
    console.error("AI regenerate error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Ошибка при обновлении наблюдений" },
    });
  }
};
