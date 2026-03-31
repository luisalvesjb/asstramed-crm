import { Router } from "express";
import * as dashboardController from "./dashboard.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { asyncHandler } from "../../utils/async-handler";

export const dashboardRoutes = Router();

dashboardRoutes.use(authMiddleware);
dashboardRoutes.get(
  "/activities",
  permissionMiddleware([PERMISSIONS.DASHBOARD_READ]),
  asyncHandler(dashboardController.getDashboardActivities)
);
