import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { registerAuditLog } from "../../services/audit.service";
import {
  setProfilePermissions,
  syncPermissionCatalog,
  syncSystemProfiles
} from "../../services/permission.service";
import { ALL_PERMISSION_KEYS } from "../../config/permissions";
import {
  CreateProfileInput,
  ProfileOutput,
  ProfilesListOutput,
  UpdateProfileInput
} from "./profiles.interfaces";

function normalizeProfileKey(input: string): string {
  return input
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function toProfileOutput(profile: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isAdmin: boolean;
  isSystem: boolean;
  isActive: boolean;
  permissions: Array<{ permission: { key: string } }>;
  _count: { users: number };
}): ProfileOutput {
  return {
    id: profile.id,
    key: profile.key,
    name: profile.name,
    description: profile.description,
    isAdmin: profile.isAdmin,
    isSystem: profile.isSystem,
    isActive: profile.isActive,
    userCount: profile._count.users,
    permissionKeys: profile.permissions.map((item) => item.permission.key)
  };
}

async function getProfileOrThrow(profileId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId }
  });

  if (!profile) {
    throw new AppError("Perfil nao encontrado", 404);
  }

  return profile;
}

async function findProfileOutputById(profileId: string): Promise<ProfileOutput> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        },
        orderBy: {
          permission: {
            key: "asc"
          }
        }
      },
      _count: {
        select: {
          users: true
        }
      }
    }
  });

  if (!profile) {
    throw new AppError("Perfil nao encontrado", 404);
  }

  return toProfileOutput(profile);
}

export async function listProfiles(): Promise<ProfilesListOutput> {
  await syncPermissionCatalog();
  await syncSystemProfiles();

  const permissionsCatalog = await prisma.permission.findMany({
    where: {
      key: {
        in: ALL_PERMISSION_KEYS
      }
    },
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      description: true
    }
  });

  const profiles = await prisma.profile.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        },
        orderBy: {
          permission: {
            key: "asc"
          }
        }
      },
      _count: {
        select: {
          users: true
        }
      }
    }
  });

  return {
    profiles: profiles.map(toProfileOutput),
    permissionsCatalog
  };
}

export async function getProfileById(profileId: string): Promise<ProfileOutput> {
  await syncPermissionCatalog();
  await syncSystemProfiles();
  return findProfileOutputById(profileId);
}

export async function createProfile(actorId: string, actorIsAdmin: boolean, input: CreateProfileInput): Promise<ProfileOutput> {
  await syncPermissionCatalog();

  const normalizedKey = normalizeProfileKey(input.key ?? input.name);

  if (!normalizedKey) {
    throw new AppError("Chave de perfil invalida", 422);
  }

  const existing = await prisma.profile.findUnique({
    where: { key: normalizedKey },
    select: { id: true }
  });

  if (existing) {
    throw new AppError("Ja existe um perfil com esta chave", 409);
  }

  const isAdmin = actorIsAdmin ? Boolean(input.isAdmin) : false;

  const profile = await prisma.profile.create({
    data: {
      key: normalizedKey,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isAdmin,
      isSystem: false,
      isActive: input.isActive ?? true
    },
    select: { id: true }
  });

  if (isAdmin) {
    await setProfilePermissions(profile.id, []);
  } else {
    await setProfilePermissions(profile.id, input.permissionKeys);
  }

  await registerAuditLog({
    actorId,
    action: "PROFILE_CREATED",
    entity: "PROFILE",
    entityId: profile.id,
    payload: {
      key: normalizedKey,
      permissionCount: isAdmin ? 0 : input.permissionKeys.length,
      isAdmin
    }
  });

  return findProfileOutputById(profile.id);
}

export async function updateProfile(
  actorId: string,
  actorIsAdmin: boolean,
  profileId: string,
  input: UpdateProfileInput
): Promise<ProfileOutput> {
  const profile = await getProfileOrThrow(profileId);

  const nextName = input.name?.trim() ?? profile.name;
  const nextDescription = input.description !== undefined ? (input.description?.trim() || null) : profile.description;
  const nextIsActive = input.isActive ?? profile.isActive;
  const nextIsAdmin = input.isAdmin !== undefined ? Boolean(input.isAdmin) : profile.isAdmin;

  if (!actorIsAdmin && input.isAdmin !== undefined) {
    throw new AppError("Apenas admin pode alterar flag de administrador", 403);
  }

  if (profile.isSystem && input.key && normalizeProfileKey(input.key) !== profile.key) {
    throw new AppError("Nao e permitido alterar a chave de perfis de sistema", 422);
  }

  if (profile.isSystem && profile.key === "ADMIN" && input.isAdmin === false) {
    throw new AppError("Perfil ADMIN deve permanecer administrador", 422);
  }

  let nextKey = profile.key;

  if (input.key !== undefined) {
    nextKey = normalizeProfileKey(input.key);

    if (!nextKey) {
      throw new AppError("Chave de perfil invalida", 422);
    }
  }

  if (nextKey !== profile.key) {
    const keyConflict = await prisma.profile.findUnique({
      where: { key: nextKey },
      select: { id: true }
    });

    if (keyConflict && keyConflict.id !== profileId) {
      throw new AppError("Ja existe um perfil com esta chave", 409);
    }
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: {
      key: nextKey,
      name: nextName,
      description: nextDescription,
      isAdmin: nextIsAdmin,
      isActive: nextIsActive
    }
  });

  await prisma.user.updateMany({
    where: {
      profileId
    },
    data: {
      isAdmin: nextIsAdmin
    }
  });

  await registerAuditLog({
    actorId,
    action: "PROFILE_UPDATED",
    entity: "PROFILE",
    entityId: profileId,
    payload: {
      from: {
        key: profile.key,
        name: profile.name,
        isAdmin: profile.isAdmin,
        isActive: profile.isActive
      },
      to: {
        key: nextKey,
        name: nextName,
        isAdmin: nextIsAdmin,
        isActive: nextIsActive
      }
    }
  });

  return findProfileOutputById(profileId);
}

export async function updateProfilePermissions(
  actorId: string,
  profileId: string,
  permissionKeys: string[]
): Promise<ProfileOutput> {
  const profile = await getProfileOrThrow(profileId);

  if (profile.isAdmin) {
    throw new AppError("Perfis administradores possuem acesso total por padrao", 422);
  }

  await setProfilePermissions(profileId, permissionKeys);

  await registerAuditLog({
    actorId,
    action: "PROFILE_PERMISSIONS_UPDATED",
    entity: "PROFILE",
    entityId: profileId,
    payload: {
      permissionCount: permissionKeys.length
    }
  });

  return findProfileOutputById(profileId);
}

export async function deleteProfile(actorId: string, profileId: string): Promise<{ id: string }> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      _count: {
        select: {
          users: true
        }
      }
    }
  });

  if (!profile) {
    throw new AppError("Perfil nao encontrado", 404);
  }

  if (profile.isSystem) {
    throw new AppError("Nao e permitido excluir perfis de sistema", 422);
  }

  if (profile._count.users > 0) {
    throw new AppError("Nao e possivel excluir perfil vinculado a usuarios", 409);
  }

  await prisma.$transaction([
    prisma.profilePermission.deleteMany({ where: { profileId } }),
    prisma.profile.delete({ where: { id: profileId } })
  ]);

  await registerAuditLog({
    actorId,
    action: "PROFILE_DELETED",
    entity: "PROFILE",
    entityId: profileId,
    payload: {
      key: profile.key,
      name: profile.name
    }
  });

  return { id: profileId };
}
