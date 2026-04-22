import { FinancialEntryStatus } from "@prisma/client";
import { z } from "zod";
import {
  nullableOptionalDateInputSchema,
  optionalDateArrayInputSchema,
  optionalDateInputSchema
} from "../../utils/date";

export const financialEntryIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listFinancialEntriesSchema = z.object({
  dueDateFrom: optionalDateInputSchema,
  dueDateTo: optionalDateInputSchema,
  paymentDateFrom: optionalDateInputSchema,
  paymentDateTo: optionalDateInputSchema,
  launchDateFrom: optionalDateInputSchema,
  launchDateTo: optionalDateInputSchema,
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
  amountPaid: z.coerce.number().nonnegative().optional(),
  dueDate: optionalDateInputSchema,
  installmentCount: z.coerce.number().int().min(1).max(120).default(1),
  installmentDates: optionalDateArrayInputSchema,
  paymentDate: optionalDateInputSchema,
  categoryId: z.string().uuid(),
  costCenterId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  paymentKey: z.string().optional(),
});

export const updateFinancialEntrySchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  amountPaid: z.coerce.number().nonnegative().nullable().optional(),
  dueDate: optionalDateInputSchema,
  paymentDate: nullableOptionalDateInputSchema,
  categoryId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().nullable().optional(),
  paymentMethodId: z.string().uuid().nullable().optional(),
  paymentKey: z.string().nullable().optional()
});

export const payFinancialEntrySchema = z.object({
  paymentDate: optionalDateInputSchema,
  amountPaid: z.coerce.number().nonnegative().optional(),
  paymentMethodId: z.string().uuid().optional(),
  paymentKey: z.string().optional()
});
