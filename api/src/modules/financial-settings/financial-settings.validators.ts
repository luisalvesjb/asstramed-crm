import { z } from "zod";

export const listFinancialSettingsSchema = z.object({
  status: z.enum(["active", "inactive", "all"]).optional(),
  includeUsedInactive: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((value) => value === true || value === "true")
});

export const createFinancialSettingSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

export const updateFinancialSettingSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

export const financialSettingIdParamSchema = z.object({
  id: z.string().uuid()
});
