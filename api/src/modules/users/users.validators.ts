import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  profileId: z.string().min(1),
  permissionKeys: z.array(z.string()).default([])
});

export const updateUserProfileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  profileId: z.string().min(1)
});

export const updateUserActiveSchema = z.object({
  isActive: z.boolean()
});

export const updateMyProfileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email()
});

export const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6)
});
