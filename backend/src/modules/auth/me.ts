import type { NextFunction, Response } from "express";
import prisma from "../../db/index.js";
import type { AuthRequest } from "../../middleware/auth.js";

export const me = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res
        .status(401)
        .json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};
