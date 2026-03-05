import { FinancialEntryStatus, FinancialRecurrenceCycle } from "@prisma/client";
import { z } from "zod";

export const financialEntryIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listFinancialEntriesSchema = z.object({
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  paymentDateFrom: z.coerce.date().optional(),
  paymentDateTo: z.coerce.date().optional(),
  launchDateFrom: z.coerce.date().optional(),
  launchDateTo: z.coerce.date().optional(),
  categoryId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  status: z.nativeEnum(FinancialEntryStatus).optional(),
  isFixed: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  search: z.string().optional()
});

export const createFinancialEntrySchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
  paymentDate: z.coerce.date().optional(),
  launchDate: z.coerce.date().optional(),
  status: z.nativeEnum(FinancialEntryStatus).optional(),
  categoryId: z.string().uuid(),
  costCenterId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  isFixed: z.boolean().default(false),
  recurrenceCycle: z.nativeEnum(FinancialRecurrenceCycle).default(FinancialRecurrenceCycle.NONE),
  recurrenceEndDate: z.coerce.date().optional()
});

export const updateFinancialEntrySchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  dueDate: z.coerce.date().optional(),
  paymentDate: z.coerce.date().nullable().optional(),
  launchDate: z.coerce.date().optional(),
  status: z.nativeEnum(FinancialEntryStatus).optional(),
  categoryId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().nullable().optional(),
  paymentMethodId: z.string().uuid().nullable().optional(),
  isFixed: z.boolean().optional(),
  recurrenceCycle: z.nativeEnum(FinancialRecurrenceCycle).optional(),
  recurrenceEndDate: z.coerce.date().nullable().optional()
});

export const payFinancialEntrySchema = z.object({
  paymentDate: z.coerce.date().optional(),
  paymentMethodId: z.string().uuid().optional()
});
