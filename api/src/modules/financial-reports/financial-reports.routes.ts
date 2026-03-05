import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as financialReportsController from "./financial-reports.controller";

export const financialReportsRoutes = Router();

financialReportsRoutes.use(authMiddleware);
financialReportsRoutes.use(permissionMiddleware([PERMISSIONS.FINANCE_REPORTS]));

financialReportsRoutes.get("/daily", financialReportsController.dailyReport);
financialReportsRoutes.get("/outflow-by-day", financialReportsController.outflowByDay);
