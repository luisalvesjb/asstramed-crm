import { ActivityStatus } from "@prisma/client";
import { z } from "zod";

export const reportFiltersSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  companyId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  status: z.nativeEnum(ActivityStatus).optional(),
  openOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true"))
});
