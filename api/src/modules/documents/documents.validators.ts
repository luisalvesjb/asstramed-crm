import { z } from "zod";

export const createDocumentSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional()
});

export const listDocumentsSchema = z.object({
  companyId: z.string().uuid()
});
