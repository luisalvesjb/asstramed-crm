import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import * as messagesController from "./messages.controller";
import { asyncHandler } from "../../utils/async-handler";

export const messagesRoutes = Router();

messagesRoutes.use(authMiddleware);

messagesRoutes.get("/", asyncHandler(messagesController.listMessages));
messagesRoutes.get("/:id/thread", asyncHandler(messagesController.getMessageThread));
messagesRoutes.post("/", asyncHandler(messagesController.createMessage));
messagesRoutes.post("/:id/replies", asyncHandler(messagesController.replyMessage));
messagesRoutes.patch("/:id/status", asyncHandler(messagesController.updateMessageStatus));
