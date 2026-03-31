import { Router } from "express";
import * as authController from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(authController.login));
authRoutes.post("/refresh", asyncHandler(authController.refresh));
authRoutes.post("/logout", asyncHandler(authController.logout));
authRoutes.get("/me", authMiddleware, asyncHandler(authController.me));
