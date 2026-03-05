import { Router } from "express";
import * as usersController from "./users.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { userAvatarUpload } from "../../gateways/user-avatar.gateway";

export const usersRoutes = Router();

usersRoutes.use(authMiddleware);

usersRoutes.get("/me/profile", usersController.getMyProfile);
usersRoutes.patch("/me/profile", usersController.updateMyProfile);
usersRoutes.patch("/me/password", usersController.changeMyPassword);
usersRoutes.put("/me/avatar", userAvatarUpload.single("avatar"), usersController.updateMyAvatar);

usersRoutes.get("/", permissionMiddleware([PERMISSIONS.USERS_READ]), usersController.listUsers);
usersRoutes.post("/", permissionMiddleware([PERMISSIONS.USERS_WRITE]), usersController.createUser);
usersRoutes.patch(
  "/:id/profile",
  permissionMiddleware([PERMISSIONS.USERS_PROFILE_EDIT]),
  usersController.updateUserProfile
);
usersRoutes.patch(
  "/:id/active",
  permissionMiddleware([PERMISSIONS.USERS_ACTIVATE]),
  usersController.updateUserActive
);
usersRoutes.delete(
  "/:id",
  permissionMiddleware([PERMISSIONS.USERS_DELETE]),
  usersController.deleteUser
);
