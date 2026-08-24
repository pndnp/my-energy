import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Авторизация только по httpOnly-cookie «token» (JWT).
 * Tоken устанавливается при /api/auth/login и /api/auth/register,
 * очищается при /api/auth/logout. Bearer-заголовок НЕ поддерживается
 * (решение design.md §1: защита от XSS, автоматическая отправка cookie).
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    console.error("[Auth] No token found. Headers:", JSON.stringify(req.headers));
    return res
      .status(401)
      .json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Server misconfigured" } });
    }
    const decoded = jwt.verify(token, secret) as { userId: string };
    console.log("[Auth] Token verified for userId:", decoded.userId);
    req.userId = decoded.userId;
    next();
  } catch {
    console.error("[Auth] Token verification failed");
    return res
      .status(401)
      .json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
};
