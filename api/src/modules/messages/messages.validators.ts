import { MessagePriority } from "@prisma/client";
import { z } from "zod";

export const listMessagesSchema = z.object({
  companyId: z.string().uuid().optional(),
  includeResolved: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((value) => (value === undefined ? true : value === true || value === "true")),
  search: z.string().optional()
});

export const messageIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createMessageSchema = z.object({
  companyId: z.string().uuid(),
  content: z.string().min(2),
  priority: z.nativeEnum(MessagePriority).default(MessagePriority.MEDIA),
  directedToId: z.string().uuid().optional()
});

export const replyMessageSchema = z.object({
  content: z.string().min(1)
});

export const updateMessageStatusSchema = z.object({
  status: z.enum(["ABERTA", "RESOLVIDA"])
});
