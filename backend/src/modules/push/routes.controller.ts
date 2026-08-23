import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import { subscriptionSchema } from "./schema.js";
import * as service from "./service.js";

export const addSubscription = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    }
    const result = subscriptionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: result.error.errors.map((e) => e.message).join("; "),
        },
      });
    }

    const userId = req.userId;
    const { created } = await service.upsertSubscription(userId, result.data);
    return res.status(created ? 201 : 200).json({ status: "ok" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};

export const sendTestPush = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    }
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const title = typeof body.title === "string" ? body.title : undefined;
    const textBody = typeof body.body === "string" ? body.body : undefined;
    const result = await service.sendTestPush(req.userId, { title, body: textBody });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};

export const removeSubscription = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    }
    // Browser push endpoints contain slashes (https://fcm.googleapis.com/fcm/send/...),
    // so the route uses a wildcard and the endpoint is parsed from the request path.
    const endpoint = decodeURIComponent(req.url.replace(/^\//, "").split("?")[0]);
    if (!endpoint) {
      return res
        .status(400)
        .json({ error: { code: "VALIDATION_ERROR", message: "Endpoint is required" } });
    }
    const userId = req.userId;

    const removed = await service.removeByEndpoint(userId, endpoint);
    if (!removed) {
      return res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Subscription not found" } });
    }
    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};
