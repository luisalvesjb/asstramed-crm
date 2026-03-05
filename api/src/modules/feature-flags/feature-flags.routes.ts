import { Router } from "express";
import * as featureFlagsController from "./feature-flags.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";

export const featureFlagsRoutes = Router();

featureFlagsRoutes.use(authMiddleware);
featureFlagsRoutes.use(permissionMiddleware([PERMISSIONS.PERMISSIONS_MANAGE]));

featureFlagsRoutes.get("/permissions", featureFlagsController.listPermissions);
featureFlagsRoutes.get("/users/:userId", featureFlagsController.getUserPermissions);
featureFlagsRoutes.put("/users/:userId", featureFlagsController.updateUserPermissions);
