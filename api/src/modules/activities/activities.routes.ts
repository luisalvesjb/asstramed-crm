import { Router } from "express";
import * as activitiesController from "./activities.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";

export const activitiesRoutes = Router();

activitiesRoutes.use(authMiddleware);

activitiesRoutes.get("/", asyncHandler(activitiesController.listActivities));
activitiesRoutes.get("/interactions", asyncHandler(activitiesController.listActivityInteractions));
activitiesRoutes.get("/:id", asyncHandler(activitiesController.getActivityById));
activitiesRoutes.post("/", asyncHandler(activitiesController.createActivity));
activitiesRoutes.post("/:id/messages", asyncHandler(activitiesController.addActivityMessage));
activitiesRoutes.patch(
  "/:id/status",
  asyncHandler(activitiesController.changeActivityStatus)
);
