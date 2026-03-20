import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import * as messagesController from "./messages.controller";

export const messagesRoutes = Router();

messagesRoutes.use(authMiddleware);

messagesRoutes.get("/", messagesController.listMessages);
messagesRoutes.get("/:id/thread", messagesController.getMessageThread);
messagesRoutes.post("/", messagesController.createMessage);
messagesRoutes.post("/:id/replies", messagesController.replyMessage);
messagesRoutes.patch("/:id/status", messagesController.updateMessageStatus);
