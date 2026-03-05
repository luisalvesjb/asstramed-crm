import { ActivityStatus } from "@prisma/client";
import { z } from "zod";

export const dashboardActivitiesSchema = z.object({
  date: z.coerce.date().optional(),
  status: z.nativeEnum(ActivityStatus).optional(),
  companyId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  tagKey: z.string().optional()
});
