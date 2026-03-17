import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as messagesController from "./messages.controller";

export const messagesRoutes = Router();

messagesRoutes.use(authMiddleware);

messagesRoutes.get("/", permissionMiddleware([PERMISSIONS.MESSAGES_READ]), messagesController.listMessages);
messagesRoutes.get(
  "/:id/thread",
  permissionMiddleware([PERMISSIONS.MESSAGES_READ]),
  messagesController.getMessageThread
);
messagesRoutes.post("/", permissionMiddleware([PERMISSIONS.MESSAGES_WRITE]), messagesController.createMessage);
messagesRoutes.post(
  "/:id/replies",
  permissionMiddleware([PERMISSIONS.MESSAGES_WRITE]),
  messagesController.replyMessage
);
messagesRoutes.patch(
  "/:id/resolve",
  permissionMiddleware([PERMISSIONS.MESSAGES_RESOLVE]),
  messagesController.resolveMessage
);
