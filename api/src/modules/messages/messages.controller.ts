import { Request, Response } from "express";
import {
  createMessageSchema,
  listMessagesSchema,
  messageIdParamSchema,
  replyMessageSchema,
  updateMessageStatusSchema
} from "./messages.validators";
import * as messagesService from "./messages.service";

export async function listMessages(req: Request, res: Response): Promise<void> {
  const filters = listMessagesSchema.parse(req.query);
  const items = await messagesService.listMessages(filters);
  res.status(200).json(items);
}

export async function getMessageThread(req: Request, res: Response): Promise<void> {
  const { id } = messageIdParamSchema.parse(req.params);
  const thread = await messagesService.getThread(id);
  res.status(200).json(thread);
}

export async function createMessage(req: Request, res: Response): Promise<void> {
  const payload = createMessageSchema.parse(req.body);
  const message = await messagesService.createMessage(req.user!.id, payload);
  res.status(201).json(message);
}

export async function replyMessage(req: Request, res: Response): Promise<void> {
  const { id } = messageIdParamSchema.parse(req.params);
  const payload = replyMessageSchema.parse(req.body);
  const reply = await messagesService.replyMessage(req.user!.id, id, payload.content);
  res.status(201).json(reply);
}

export async function resolveMessage(req: Request, res: Response): Promise<void> {
  const { id } = messageIdParamSchema.parse(req.params);
  const message = await messagesService.resolveMessage(req.user!.id, id);
  res.status(200).json(message);
}

export async function updateMessageStatus(req: Request, res: Response): Promise<void> {
  const { id } = messageIdParamSchema.parse(req.params);
  const payload = updateMessageStatusSchema.parse(req.body);
  const message = await messagesService.updateMessageStatus(req.user!.id, id, payload.status);
  res.status(200).json(message);
}
