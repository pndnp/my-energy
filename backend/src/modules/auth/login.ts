import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import ms from "ms";
import prisma from "../../db/index.js";

export const login = async (req: Request, res: Response) => {
  try {
    const body = req.body as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return res
        .status(401)
        .json({ error: { code: "UNAUTHORIZED", message: "Email and password required" } });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(401)
        .json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res
        .status(401)
        .json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Server misconfigured" } });
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as StringValue;

    const token = jwt.sign({ userId: user.id }, secret, { expiresIn });

    // Токен отдаётся ТОЛЬКО в httpOnly-cookie (см. openspec mvp-application/design.md §1).
    // В JSON-ответ токен НЕ дублируется — это исключает его утечку через localStorage/XSS.
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ms(expiresIn),
    });

    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};
