import { z } from "zod";

export const financialDailyReportSchema = z.object({
  date: z.coerce.date().optional()
});

export const financialOutflowByDaySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  categoryId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional()
});
