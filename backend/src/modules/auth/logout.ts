import type { Request, Response } from "express";

interface AuthRequest extends Request {
  userId?: string;
}

export const logout = (_req: AuthRequest, res: Response) => {
  res.clearCookie("token", { path: "/", sameSite: "strict" });
  res.json({ message: "Logged out" });
};
