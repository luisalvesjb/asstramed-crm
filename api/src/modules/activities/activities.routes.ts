import { Router } from "express";
import * as activitiesController from "./activities.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

export const activitiesRoutes = Router();

activitiesRoutes.use(authMiddleware);

activitiesRoutes.get("/", activitiesController.listActivities);
activitiesRoutes.get("/interactions", activitiesController.listActivityInteractions);
activitiesRoutes.get("/:id", activitiesController.getActivityById);
activitiesRoutes.post("/", activitiesController.createActivity);
activitiesRoutes.post("/:id/messages", activitiesController.addActivityMessage);
activitiesRoutes.patch(
  "/:id/status",
  activitiesController.changeActivityStatus
);
