import { Router } from "express";
import * as reportsController from "./reports.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";

export const reportsRoutes = Router();

reportsRoutes.use(authMiddleware);
reportsRoutes.use(permissionMiddleware([PERMISSIONS.REPORTS_READ]));

reportsRoutes.get("/activities", reportsController.activities);
reportsRoutes.get("/activities/csv", reportsController.activitiesCsv);
reportsRoutes.get("/productivity", reportsController.productivity);
reportsRoutes.get("/pending-by-company", reportsController.pendingByCompany);
reportsRoutes.get("/contracts-by-due", reportsController.contractsByDue);
