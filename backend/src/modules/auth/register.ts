import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { z } from "zod";
import prisma from "../../db/index.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const register = async (req: Request, res: Response) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: result.error.errors.map((e) => e.message).join("; "),
        },
      });
    }

    const { email, password } = result.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "Email already registered" },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash } });

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
    });

    res.status(201).json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};
