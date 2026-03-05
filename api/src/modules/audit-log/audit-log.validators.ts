import { z } from "zod";

export const listAuditLogsSchema = z.object({
  action: z.string().optional(),
  entity: z.string().optional(),
  actorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});
