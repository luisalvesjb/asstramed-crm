import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as profilesController from "./profiles.controller";

export const profilesRoutes = Router();

profilesRoutes.use(authMiddleware);
profilesRoutes.use(permissionMiddleware([PERMISSIONS.PERMISSIONS_MANAGE]));

profilesRoutes.get("/", profilesController.listProfiles);
profilesRoutes.get("/:id", profilesController.getProfileById);
profilesRoutes.post("/", profilesController.createProfile);
profilesRoutes.patch("/:id", profilesController.updateProfile);
profilesRoutes.put("/:id/permissions", profilesController.updateProfilePermissions);
profilesRoutes.delete("/:id", profilesController.deleteProfile);
