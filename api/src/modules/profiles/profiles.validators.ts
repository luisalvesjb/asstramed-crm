import { z } from "zod";

export const profileIdParamSchema = z.object({
  id: z.string().min(1)
});

export const createProfileSchema = z.object({
  name: z.string().min(2),
  key: z.string().min(2).max(60).optional(),
  description: z.string().max(255).nullable().optional(),
  isAdmin: z.boolean().optional(),
  isActive: z.boolean().optional(),
  permissionKeys: z.array(z.string()).default([])
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  key: z.string().min(2).max(60).optional(),
  description: z.string().max(255).nullable().optional(),
  isAdmin: z.boolean().optional(),
  isActive: z.boolean().optional()
});

export const updateProfilePermissionsSchema = z.object({
  permissionKeys: z.array(z.string()).default([])
});
