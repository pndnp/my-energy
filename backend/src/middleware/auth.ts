import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Поддерживаем и cookie, и Authorization Bearer token
  let token: string | undefined = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7); // убираем "Bearer "
  }

  if (!token) {
    console.error("[Auth] No token found. Headers:", JSON.stringify(req.headers));
    return res
      .status(401)
      .json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
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
