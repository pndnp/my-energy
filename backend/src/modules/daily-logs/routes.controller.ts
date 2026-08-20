import type { Response } from "express";
import * as service from "./service.js";
import { dailyLogSchema, partialDailyLogSchema } from "./schema.js";
import type { AuthRequest } from "../../middleware/auth.js";

export const createDailyLog = async (req: AuthRequest, res: Response) => {
  try {
    const result = dailyLogSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: result.error.errors.map((e) => e.message).join("; "),
        },
      });
    }

    const userId = req.userId!;
    const existing = await service.getByDate(userId, result.data.date);

    if (existing) {
      const updated = await service.upsert(userId, result.data);
      return res.status(200).json(updated);
    }

    const log = await service.create(userId, result.data);
    return res.status(201).json(log);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};

export const getDailyLog = async (req: AuthRequest, res: Response) => {
  try {
    const date = req.params.date as string;
    const userId = req.userId!;

    const log = await service.getByDate(userId, date);
    if (!log) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "No log found for this date" } });
    }

    return res.status(200).json(log);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};

export const updateDailyLog = async (req: AuthRequest, res: Response) => {
  try {
    const date = req.params.date as string;
    const userId = req.userId!;

    const result = partialDailyLogSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: result.error.errors.map((e) => e.message).join("; "),
        },
      });
    }

    const log = await service.updatePartial(userId, date, result.data);
    return res.status(200).json(log);
  } catch (err) {
    if ((err as Error).message === "NOT_FOUND") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "No log found for this date" } });
    }
    console.error(err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};

export const listDailyLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (!from || !to) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Both 'from' and 'to' query parameters are required" } });
    }

    const logs = await service.listByRange(userId, String(from), String(to));
    return res.status(200).json(logs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};
