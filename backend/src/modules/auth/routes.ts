import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import * as loginHandler from "./login.js";
import * as logoutHandler from "./logout.js";
import * as meHandler from "./me.js";
import * as registerHandler from "./register.js";

const router = Router();

router.post("/register", registerHandler.register);
router.post("/login", loginHandler.login);
router.post("/logout", logoutHandler.logout);

// Защищённые маршруты — требуют авторизации
router.get("/me", authMiddleware, meHandler.me);

export default router;
