import { Router } from "express";
import * as activitiesController from "./activities.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";

export const activitiesRoutes = Router();

activitiesRoutes.use(authMiddleware);

activitiesRoutes.get("/", permissionMiddleware([PERMISSIONS.ACTIVITIES_READ]), activitiesController.listActivities);
activitiesRoutes.get("/:id", permissionMiddleware([PERMISSIONS.ACTIVITIES_READ]), activitiesController.getActivityById);
activitiesRoutes.post("/", permissionMiddleware([PERMISSIONS.ACTIVITIES_CREATE]), activitiesController.createActivity);
activitiesRoutes.patch(
  "/:id/status",
  permissionMiddleware([PERMISSIONS.ACTIVITIES_FINISH]),
  activitiesController.changeActivityStatus
);
