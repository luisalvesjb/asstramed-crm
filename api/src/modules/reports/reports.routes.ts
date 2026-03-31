import { Router } from "express";
import * as reportsController from "./reports.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { asyncHandler } from "../../utils/async-handler";

export const reportsRoutes = Router();

reportsRoutes.use(authMiddleware);
reportsRoutes.use(permissionMiddleware([PERMISSIONS.REPORTS_READ]));

reportsRoutes.get("/activities", asyncHandler(reportsController.activities));
reportsRoutes.get("/activities/csv", asyncHandler(reportsController.activitiesCsv));
reportsRoutes.get("/productivity", asyncHandler(reportsController.productivity));
reportsRoutes.get("/pending-by-company", asyncHandler(reportsController.pendingByCompany));
reportsRoutes.get("/contracts-by-due", asyncHandler(reportsController.contractsByDue));
