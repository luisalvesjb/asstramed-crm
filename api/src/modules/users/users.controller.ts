import { Request, Response } from "express";
import {
  changeMyPasswordSchema,
  createUserSchema,
  updateMyProfileSchema,
  updateUserActiveSchema,
  updateUserProfileSchema
} from "./users.validators";
import * as usersService from "./users.service";

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await usersService.listUsers();
  res.status(200).json(users);
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const payload = createUserSchema.parse(req.body);
  const user = await usersService.createUser(req.user!.id, payload);
  res.status(201).json(user);
}

export async function updateUserProfile(req: Request, res: Response): Promise<void> {
  const payload = updateUserProfileSchema.parse(req.body);
  const user = await usersService.updateUserProfile(req.user!.id, req.params.id, payload);
  res.status(200).json(user);
}

export async function updateUserActive(req: Request, res: Response): Promise<void> {
  const { isActive } = updateUserActiveSchema.parse(req.body);
  const user = await usersService.updateUserActive(req.user!.id, req.params.id, isActive);
  res.status(200).json(user);
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const result = await usersService.deleteUser(req.user!.id, req.params.id);
  res.status(200).json(result);
}

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const profile = await usersService.getMyProfile(req.user!.id);
  res.status(200).json(profile);
}

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  const payload = updateMyProfileSchema.parse(req.body);
  const profile = await usersService.updateMyProfile(req.user!.id, payload);
  res.status(200).json(profile);
}

export async function changeMyPassword(req: Request, res: Response): Promise<void> {
  const payload = changeMyPasswordSchema.parse(req.body);
  const result = await usersService.changeMyPassword(req.user!.id, payload);
  res.status(200).json(result);
}

export async function updateMyAvatar(req: Request, res: Response): Promise<void> {
  const profile = await usersService.updateMyAvatar(req.user!.id, req.file);
  res.status(200).json(profile);
}
