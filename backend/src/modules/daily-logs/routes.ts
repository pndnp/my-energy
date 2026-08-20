import { Router } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import * as controller from "./routes.controller.js";

const router = Router();

// All routes require authentication
router.use((_req: AuthRequest, _res, next) => {
  // Middleware will be applied per-route below
  next();
});

router.post("/", controller.createDailyLog);
router.get("/:date", controller.getDailyLog);
router.put("/:date", controller.updateDailyLog);
router.get("/", controller.listDailyLogs);

export default router;
