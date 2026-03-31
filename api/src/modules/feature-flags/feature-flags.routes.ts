import { Router } from "express";
import * as featureFlagsController from "./feature-flags.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { asyncHandler } from "../../utils/async-handler";

export const featureFlagsRoutes = Router();

featureFlagsRoutes.use(authMiddleware);
featureFlagsRoutes.use(permissionMiddleware([PERMISSIONS.PERMISSIONS_MANAGE]));

featureFlagsRoutes.get("/permissions", asyncHandler(featureFlagsController.listPermissions));
featureFlagsRoutes.get("/users/:userId", asyncHandler(featureFlagsController.getUserPermissions));
featureFlagsRoutes.put("/users/:userId", asyncHandler(featureFlagsController.updateUserPermissions));
