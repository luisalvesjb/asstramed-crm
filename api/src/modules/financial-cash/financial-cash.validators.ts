import { CashMovementType, CashReceiptCategory } from "@prisma/client";
import { z } from "zod";

export const cashBoxIdParamSchema = z.object({
  id: z.string().uuid()
});

export const cashOverviewQuerySchema = z.object({
  date: z.coerce.date().optional()
});

export const openCashBoxSchema = z.object({
  date: z.coerce.date().optional(),
  openingAmount: z.coerce.number().min(0),
  openingNotes: z.string().max(500).optional()
});

export const createCashMovementSchema = z.object({
  type: z.nativeEnum(CashMovementType),
  receiptCategory: z.nativeEnum(CashReceiptCategory),
  amount: z.coerce.number().positive(),
  description: z.string().max(500).optional(),
  reference: z.string().max(120).optional()
});

export const closeCashBoxSchema = z.object({
  password: z.string().min(4),
  countedAmount: z.coerce.number().min(0),
  closingNotes: z.string().max(500).optional()
});
