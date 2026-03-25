import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2),
  login: z.string().trim().min(3),
  password: z.string().min(6),
  profileId: z.string().min(1),
  permissionKeys: z.array(z.string()).default([])
});

export const updateUserProfileSchema = z.object({
  name: z.string().min(2),
  login: z.string().trim().min(3),
  profileId: z.string().min(1)
});

export const updateUserActiveSchema = z.object({
  isActive: z.boolean()
});

export const updateMyProfileSchema = z.object({
  name: z.string().min(2),
  login: z.string().trim().min(3)
});

export const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6)
});
