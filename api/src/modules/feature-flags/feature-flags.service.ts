import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import {
  getUserExplicitPermissionKeys,
  resolveEffectivePermissions,
  setUserPermissions,
  userHasExplicitPermission
} from "../../services/permission.service";
import { registerAuditLog } from "../../services/audit.service";
import { ALL_PERMISSION_KEYS, PERMISSIONS } from "../../config/permissions";

export async function listPermissions() {
  return prisma.permission.findMany({
    where: {
      key: {
        in: ALL_PERMISSION_KEYS
      }
    },
    orderBy: { key: "asc" }
  });
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

  const targetExplicitPermissions = await getUserExplicitPermissionKeys(userId);
  const targetIsSuperAdmin = targetExplicitPermissions.includes(PERMISSIONS.SYSTEM_SUPER_ADMIN);
  const payloadWantsSuperAdmin = permissionKeys.includes(PERMISSIONS.SYSTEM_SUPER_ADMIN);

  if (targetIsSuperAdmin || payloadWantsSuperAdmin) {
    const actorIsSuperAdmin = await userHasExplicitPermission(actorId, PERMISSIONS.SYSTEM_SUPER_ADMIN);

    if (!actorIsSuperAdmin) {
      throw new AppError("Somente super admin pode conceder ou remover esta permissao.", 403);
    }
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
