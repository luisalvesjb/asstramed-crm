import { Router } from "express";
import * as usersController from "./users.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { userAvatarUpload } from "../../gateways/user-avatar.gateway";
import { asyncHandler } from "../../utils/async-handler";

export const usersRoutes = Router();

usersRoutes.use(authMiddleware);

usersRoutes.get("/me/profile", asyncHandler(usersController.getMyProfile));
usersRoutes.patch("/me/profile", asyncHandler(usersController.updateMyProfile));
usersRoutes.patch("/me/password", asyncHandler(usersController.changeMyPassword));
usersRoutes.put("/me/avatar", userAvatarUpload.single("avatar"), asyncHandler(usersController.updateMyAvatar));

usersRoutes.get("/", permissionMiddleware([PERMISSIONS.USERS_READ]), asyncHandler(usersController.listUsers));
usersRoutes.post("/", permissionMiddleware([PERMISSIONS.USERS_WRITE]), asyncHandler(usersController.createUser));
usersRoutes.patch(
  "/:id/profile",
  permissionMiddleware([PERMISSIONS.USERS_PROFILE_EDIT]),
  asyncHandler(usersController.updateUserProfile)
);
usersRoutes.patch(
  "/:id/active",
  permissionMiddleware([PERMISSIONS.USERS_ACTIVATE]),
  asyncHandler(usersController.updateUserActive)
);
usersRoutes.delete(
  "/:id",
  permissionMiddleware([PERMISSIONS.USERS_DELETE]),
  asyncHandler(usersController.deleteUser)
);
