import { Router } from "express";
import * as controller from "./routes.controller.js";

const router = Router();

// All routes require authentication (authMiddleware is applied where the router is mounted)
router.post("/", controller.addSubscription);

// Временный endpoint для ручной проверки push-конвейера в браузере (dev-only)
if (process.env.NODE_ENV !== "production") {
  router.post("/test-push", controller.sendTestPush);
}

router.delete("*", controller.removeSubscription);

export default router;
