import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as financialReportsController from "./financial-reports.controller";
import { asyncHandler } from "../../utils/async-handler";

export const financialReportsRoutes = Router();

financialReportsRoutes.use(authMiddleware);
financialReportsRoutes.use(permissionMiddleware([PERMISSIONS.FINANCE_REPORTS]));

financialReportsRoutes.get("/daily", asyncHandler(financialReportsController.dailyReport));
financialReportsRoutes.get("/outflow-by-day", asyncHandler(financialReportsController.outflowByDay));
