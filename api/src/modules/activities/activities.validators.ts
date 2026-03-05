import { ActivityStatus } from "@prisma/client";
import { z } from "zod";

export const listActivitiesSchema = z.object({
  date: z.coerce.date().optional(),
  status: z.nativeEnum(ActivityStatus).optional(),
  companyId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  tagKey: z.string().optional()
});

export const createActivitySchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  assignedToId: z.string().uuid(),
  dueDate: z.coerce.date().optional(),
  tagKeys: z.array(z.string()).default([])
});

export const changeActivityStatusSchema = z.object({
  status: z.nativeEnum(ActivityStatus)
});
