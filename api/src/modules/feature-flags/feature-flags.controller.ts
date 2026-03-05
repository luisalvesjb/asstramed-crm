import { Request, Response } from "express";
import { updateUserPermissionsSchema } from "./feature-flags.validators";
import * as featureFlagsService from "./feature-flags.service";

export async function listPermissions(_req: Request, res: Response): Promise<void> {
  const result = await featureFlagsService.listPermissions();
  res.status(200).json(result);
}

export async function getUserPermissions(req: Request, res: Response): Promise<void> {
  const result = await featureFlagsService.getUserPermissions(req.params.userId);
  res.status(200).json(result);
}

export async function updateUserPermissions(req: Request, res: Response): Promise<void> {
  const { permissionKeys } = updateUserPermissionsSchema.parse(req.body);
  const result = await featureFlagsService.updateUserPermissions(
    req.user!.id,
    req.params.userId,
    permissionKeys
  );

  res.status(200).json(result);
}
