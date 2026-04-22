import { z } from "zod";
import { optionalDateInputSchema } from "../../utils/date";

export const financialDailyReportSchema = z.object({
  date: optionalDateInputSchema
});

export const financialOutflowByDaySchema = z.object({
  startDate: optionalDateInputSchema,
  endDate: optionalDateInputSchema,
  categoryId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional()
});
