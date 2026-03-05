import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import {
  getUserExplicitPermissionKeys,
  resolveEffectivePermissions,
  setUserPermissions
} from "../../services/permission.service";
import { registerAuditLog } from "../../services/audit.service";

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { key: "asc" } });
}

export async function getUserPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      profileId: true,
      isAdmin: true
    }
  });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  const explicitPermissions = await getUserExplicitPermissionKeys(userId);
  const effectivePermissions = await resolveEffectivePermissions(user.profileId, explicitPermissions, user.isAdmin);

  return {
    user,
    explicitPermissions,
    effectivePermissions
  };
}

export async function updateUserPermissions(actorId: string, userId: string, permissionKeys: string[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  await setUserPermissions(userId, permissionKeys);

  await registerAuditLog({
    actorId,
    action: "USER_PERMISSIONS_UPDATED",
    entity: "USER",
    entityId: userId,
    payload: {
      permissionCount: permissionKeys.length
    }
  });

  return getUserPermissions(userId);
}
