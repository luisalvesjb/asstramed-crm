import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as profilesController from "./profiles.controller";
import { asyncHandler } from "../../utils/async-handler";

export const profilesRoutes = Router();

profilesRoutes.use(authMiddleware);
profilesRoutes.use(permissionMiddleware([PERMISSIONS.PERMISSIONS_MANAGE]));

profilesRoutes.get("/", asyncHandler(profilesController.listProfiles));
profilesRoutes.get("/:id", asyncHandler(profilesController.getProfileById));
profilesRoutes.post("/", asyncHandler(profilesController.createProfile));
profilesRoutes.patch("/:id", asyncHandler(profilesController.updateProfile));
profilesRoutes.put("/:id/permissions", asyncHandler(profilesController.updateProfilePermissions));
profilesRoutes.delete("/:id", asyncHandler(profilesController.deleteProfile));
