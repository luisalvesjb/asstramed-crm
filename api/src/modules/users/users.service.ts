import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { comparePassword, hashPassword } from "../../utils/password";
import {
  setUserPermissions,
  userHasExplicitPermission
} from "../../services/permission.service";
import { registerAuditLog } from "../../services/audit.service";
import {
  ChangeMyPasswordInput,
  CreateUserInput,
  UpdateMyProfileInput,
  UpdateUserProfileInput
} from "./users.interfaces";
import fs from "fs";
import path from "path";
import { PERMISSIONS } from "../../config/permissions";

type UserWithProfile = {
  id: string;
  name: string;
  login: string;
  email: string | null;
  profileId: string;
  isAdmin: boolean;
  avatarPath: string | null;
  avatarMimeType: string | null;
  isActive: boolean;
  isHidden?: boolean;
  lastAccessAt: Date | null;
  createdAt: Date;
  updatedAt?: Date;
  permissions?: Array<{
    permission: {
      key: string;
    };
  }>;
  profile: {
    id: string;
    key: string;
    name: string;
    isAdmin: boolean;
  };
};

function serializeUser(user: UserWithProfile) {
  const explicitPermissionKeys = user.permissions?.map((item) => item.permission.key) ?? [];

  return {
    id: user.id,
    name: user.name,
    login: user.login,
    email: user.email,
    profileId: user.profileId,
    profileKey: user.profile.key,
    profileName: user.profile.name,
    isAdmin: user.isAdmin || user.profile.isAdmin,
    isSuperAdmin: explicitPermissionKeys.includes(PERMISSIONS.SYSTEM_SUPER_ADMIN),
    avatarPath: user.avatarPath,
    avatarMimeType: user.avatarMimeType,
    isActive: user.isActive,
    lastAccessAt: user.lastAccessAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt ?? null
  };
}

async function assertActorIsSuperAdmin(actorId: string) {
  const canManage = await userHasExplicitPermission(actorId, PERMISSIONS.SYSTEM_SUPER_ADMIN);

  if (!canManage) {
    throw new AppError("Somente super admin pode executar esta acao.", 403);
  }
}

function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

async function getAssignableProfile(profileId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      key: true,
      name: true,
      isAdmin: true,
      isActive: true
    }
  });

  if (!profile) {
    throw new AppError("Perfil nao encontrado", 404);
  }

  if (!profile.isActive) {
    throw new AppError("Perfil inativo nao pode ser atribuido a usuarios", 422);
  }

  return profile;
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    where: {
      isHidden: false
    },
    orderBy: { createdAt: "desc" },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  return users.map((user) => serializeUser(user));
}

export async function createUser(actorId: string, input: CreateUserInput) {
  const login = normalizeLogin(input.login);
  const existing = await prisma.user.findUnique({ where: { login } });

  if (existing) {
    throw new AppError("Login ja cadastrado", 409);
  }

  const profile = await getAssignableProfile(input.profileId);
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      login,
      email: null,
      passwordHash,
      profileId: profile.id,
      isAdmin: profile.isAdmin
    },
    include: {
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  if (input.permissionKeys.length) {
    await setUserPermissions(user.id, input.permissionKeys);
  }

  await registerAuditLog({
    actorId,
    action: "USER_CREATED",
    entity: "USER",
    entityId: user.id,
    payload: {
      profileId: profile.id,
      profileKey: profile.key,
      permissionCount: input.permissionKeys.length
    }
  });

  return serializeUser(user);
}

export async function updateUserProfile(actorId: string, userId: string, input: UpdateUserProfileInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      },
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  const targetIsSuperAdmin = user.permissions.some(
    (item) => item.permission.key === PERMISSIONS.SYSTEM_SUPER_ADMIN
  );
  const wantsSuperAdmin = input.grantSuperAdmin;

  if (input.newPassword !== undefined || wantsSuperAdmin !== undefined || targetIsSuperAdmin) {
    await assertActorIsSuperAdmin(actorId);
  }

  const nextLogin = normalizeLogin(input.login);

  if (nextLogin !== user.login) {
    const existingWithLogin = await prisma.user.findUnique({ where: { login: nextLogin } });

    if (existingWithLogin && existingWithLogin.id !== userId) {
      throw new AppError("Login ja cadastrado", 409);
    }
  }

  const profile = await getAssignableProfile(input.profileId);
  const nextPasswordHash = input.newPassword ? await hashPassword(input.newPassword) : undefined;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim(),
      login: nextLogin,
      profileId: profile.id,
      isAdmin: profile.isAdmin,
      passwordHash: nextPasswordHash
    },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  if (wantsSuperAdmin !== undefined) {
    const currentExplicitPermissions = user.permissions.map((item) => item.permission.key);
    const nextPermissionKeys = wantsSuperAdmin
      ? [...new Set([...currentExplicitPermissions, PERMISSIONS.SYSTEM_SUPER_ADMIN])]
      : currentExplicitPermissions.filter((key) => key !== PERMISSIONS.SYSTEM_SUPER_ADMIN);

    await setUserPermissions(userId, nextPermissionKeys);
  }

  const refreshed = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  if (!refreshed) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  await registerAuditLog({
    actorId,
    action: "USER_PROFILE_UPDATED",
    entity: "USER",
    entityId: userId,
    payload: {
      from: {
        name: user.name,
        login: user.login,
        email: user.email,
        profileId: user.profileId,
        profileKey: user.profile.key
      },
      to: {
        name: updated.name,
        login: updated.login,
        email: updated.email,
        profileId: updated.profileId,
        profileKey: updated.profile.key
      }
    }
  });

  if (input.newPassword) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  return serializeUser(refreshed);
}

export async function getMyProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  return serializeUser(user);
}

export async function updateMyProfile(userId: string, input: UpdateMyProfileInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  const nextLogin = normalizeLogin(input.login);

  if (nextLogin !== user.login) {
    const existingWithLogin = await prisma.user.findUnique({ where: { login: nextLogin } });

    if (existingWithLogin && existingWithLogin.id !== userId) {
      throw new AppError("Login ja cadastrado", 409);
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim(),
      login: nextLogin
    },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  await registerAuditLog({
    actorId: userId,
    action: "MY_PROFILE_UPDATED",
    entity: "USER",
    entityId: userId,
    payload: {
      from: { name: user.name, login: user.login, email: user.email },
      to: { name: updated.name, login: updated.login, email: updated.email }
    }
  });

  return serializeUser(updated);
}

export async function changeMyPassword(userId: string, input: ChangeMyPasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  const validCurrentPassword = await comparePassword(input.currentPassword, user.passwordHash);

  if (!validCurrentPassword) {
    throw new AppError("Senha atual invalida", 422);
  }

  if (input.currentPassword === input.newPassword) {
    throw new AppError("A nova senha deve ser diferente da senha atual", 422);
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);

  await registerAuditLog({
    actorId: userId,
    action: "MY_PASSWORD_CHANGED",
    entity: "USER",
    entityId: userId
  });

  return { id: userId };
}

export async function updateMyAvatar(userId: string, file?: Express.Multer.File) {
  if (!file) {
    throw new AppError("Arquivo de avatar nao enviado", 422);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  const extension = path.extname(file.originalname).toLowerCase() || ".png";
  const fileName = `avatar-${Date.now()}${extension}`;
  const absoluteDirectory = path.resolve(process.cwd(), "assets/avatars", userId);
  const absolutePath = path.resolve(absoluteDirectory, fileName);

  fs.mkdirSync(absoluteDirectory, { recursive: true });
  fs.writeFileSync(absolutePath, file.buffer);

  const nextAvatarPath = `assets/avatars/${userId}/${fileName}`;
  const previousAvatarPath = user.avatarPath;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      avatarPath: nextAvatarPath,
      avatarMimeType: file.mimetype
    },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  if (previousAvatarPath) {
    try {
      const previousAbsolutePath = path.resolve(process.cwd(), previousAvatarPath);

      if (fs.existsSync(previousAbsolutePath)) {
        fs.unlinkSync(previousAbsolutePath);
      }
    } catch {
      // keep flow even if old avatar cleanup fails
    }
  }

  await registerAuditLog({
    actorId: userId,
    action: "MY_AVATAR_UPDATED",
    entity: "USER",
    entityId: userId,
    payload: {
      hasPreviousAvatar: Boolean(previousAvatarPath),
      nextAvatarPath
    }
  });

  return serializeUser(updated);
}

export async function updateUserActive(actorId: string, userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  if (actorId === userId && !isActive) {
    throw new AppError("Voce nao pode inativar seu proprio usuario.", 422);
  }

  const targetIsSuperAdmin = user.permissions.some(
    (item) => item.permission.key === PERMISSIONS.SYSTEM_SUPER_ADMIN
  );

  if (user.isHidden || targetIsSuperAdmin) {
    await assertActorIsSuperAdmin(actorId);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  await registerAuditLog({
    actorId,
    action: "USER_ACTIVE_UPDATED",
    entity: "USER",
    entityId: userId,
    payload: { from: user.isActive, to: isActive }
  });

  return serializeUser(updated);
}

export async function deleteUser(actorId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissions: {
        include: {
          permission: {
            select: {
              key: true
            }
          }
        }
      },
      profile: {
        select: {
          id: true,
          key: true,
          name: true,
          isAdmin: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  if (actorId === userId) {
    throw new AppError("Voce nao pode excluir seu proprio usuario.", 422);
  }

  const targetIsSuperAdmin = user.permissions.some(
    (item) => item.permission.key === PERMISSIONS.SYSTEM_SUPER_ADMIN
  );

  if (user.isHidden || targetIsSuperAdmin) {
    await assertActorIsSuperAdmin(actorId);
  }

  const [assignedActivities, createdActivities, uploadedDocuments, statusChanges] = await Promise.all([
    prisma.activity.count({ where: { assignedToId: userId } }),
    prisma.activity.count({ where: { createdById: userId } }),
    prisma.document.count({ where: { uploadedById: userId } }),
    prisma.activityStatusHistory.count({ where: { changedById: userId } })
  ]);

  if (assignedActivities || createdActivities || uploadedDocuments || statusChanges) {
    throw new AppError(
      "Nao e possivel excluir usuario com historico vinculado. Inative o usuario.",
      409
    );
  }

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.userPermission.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } })
  ]);

  await registerAuditLog({
    actorId,
    action: "USER_DELETED",
    entity: "USER",
    entityId: userId,
    payload: {
      email: user.email,
      profileId: user.profileId,
      profileKey: user.profile.key
    }
  });

  return { id: userId };
}
