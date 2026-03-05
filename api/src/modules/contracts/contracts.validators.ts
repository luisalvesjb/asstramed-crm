import { z } from "zod";

export const listContractsSchema = z.object({
  companyId: z.string().uuid().optional()
});

export const createContractSchema = z.object({
  companyId: z.string().uuid(),
  value: z.coerce.number().optional(),
  billingCycle: z.string().optional(),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
  notes: z.string().optional(),
  documentIds: z.array(z.string().uuid()).min(1)
});
