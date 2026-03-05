import { Request, Response } from "express";
import {
  createProfileSchema,
  profileIdParamSchema,
  updateProfilePermissionsSchema,
  updateProfileSchema
} from "./profiles.validators";
import * as profilesService from "./profiles.service";

export async function listProfiles(_req: Request, res: Response): Promise<void> {
  const result = await profilesService.listProfiles();
  res.status(200).json(result);
}

export async function getProfileById(req: Request, res: Response): Promise<void> {
  const { id } = profileIdParamSchema.parse(req.params);
  const result = await profilesService.getProfileById(id);
  res.status(200).json(result);
}

export async function createProfile(req: Request, res: Response): Promise<void> {
  const payload = createProfileSchema.parse(req.body);
  const result = await profilesService.createProfile(req.user!.id, req.user!.isAdmin, payload);
  res.status(201).json(result);
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { id } = profileIdParamSchema.parse(req.params);
  const payload = updateProfileSchema.parse(req.body);
  const result = await profilesService.updateProfile(req.user!.id, req.user!.isAdmin, id, payload);
  res.status(200).json(result);
}

export async function updateProfilePermissions(req: Request, res: Response): Promise<void> {
  const { id } = profileIdParamSchema.parse(req.params);
  const { permissionKeys } = updateProfilePermissionsSchema.parse(req.body);
  const result = await profilesService.updateProfilePermissions(req.user!.id, id, permissionKeys);
  res.status(200).json(result);
}

export async function deleteProfile(req: Request, res: Response): Promise<void> {
  const { id } = profileIdParamSchema.parse(req.params);
  const result = await profilesService.deleteProfile(req.user!.id, id);
  res.status(200).json(result);
}
