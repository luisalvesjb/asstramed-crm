import { z } from "zod";

export const listCompaniesSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional()
});

export const createCompanySchema = z.object({
  name: z.string().min(2),
  legalName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.string().optional(),
  nextCycleDate: z.coerce.date().optional()
});

export const addCompanyContactSchema = z.object({
  name: z.string().min(2),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional()
});

export const upsertCompanyAddressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional()
});

export const upsertCompanyPersonalInfoSchema = z.object({
  personalDocument: z.string().optional(),
  personalEmail: z.union([z.string().email(), z.literal("")]).optional(),
  personalPhone: z.string().optional(),
  personalResponsible: z.string().optional(),
  personalNotes: z.string().optional()
});
