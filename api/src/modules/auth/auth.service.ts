import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { comparePassword } from "../../utils/password";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../../services/token.service";
import { resolveEffectivePermissions } from "../../services/permission.service";
import { registerAuditLog } from "../../services/audit.service";
import { env } from "../../config/env";
import { durationToMs } from "../../utils/duration";

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  profileId: string;
  profile: {
    key: string;
    name: string;
    isAdmin: boolean;
  };
  isAdmin: boolean;
  avatarPath: string | null;
  avatarMimeType: string | null;
}): {
  id: string;
  name: string;
  email: string;
  profileId: string;
  profileKey: string;
  profileName: string;
  isAdmin: boolean;
  avatarPath: string | null;
  avatarMimeType: string | null;
} {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profileId: user.profileId,
    profileKey: user.profile.key,
    profileName: user.profile.name,
    isAdmin: user.isAdmin || user.profile.isAdmin,
    avatarPath: user.avatarPath,
    avatarMimeType: user.avatarMimeType
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: {
        select: {
          key: true,
          name: true,
          isAdmin: true
        }
      },
      permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  if (!user || !user.isActive) {
    throw new AppError("Credenciais invalidas", 401);
  }

  const validPassword = await comparePassword(password, user.passwordHash);

  if (!validPassword) {
    throw new AppError("Credenciais invalidas", 401);
  }

  const isAdmin = user.isAdmin || user.profile.isAdmin;
  const explicitPermissions = user.permissions.map((item) => item.permission.key);
  const resolvedPermissions = await resolveEffectivePermissions(user.profileId, explicitPermissions, isAdmin);
  const accessToken = signAccessToken({
    sub: user.id,
    profileId: user.profileId,
    isAdmin,
    permissions: resolvedPermissions
  });
  const refreshToken = signRefreshToken(user.id);
  const refreshTokenHash = hashToken(refreshToken);
  const refreshExpiresAt = new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        lastAccessAt: new Date(),
        isAdmin
      }
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt
      }
    })
  ]);

  await registerAuditLog({
    actorId: user.id,
    action: "LOGIN",
    entity: "USER",
    entityId: user.id
  });

  return {
    user: serializeUser(user),
    permissions: resolvedPermissions,
    accessToken,
    refreshToken
  };
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findFirst({
    where: {
      userId: payload.sub,
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (!stored) {
    throw new AppError("Refresh token invalido", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      profile: {
        select: {
          key: true,
          name: true,
          isAdmin: true
        }
      },
      permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  if (!user || !user.isActive) {
    throw new AppError("Usuario inativo", 401);
  }

  const isAdmin = user.isAdmin || user.profile.isAdmin;
  const explicitPermissions = user.permissions.map((item) => item.permission.key);
  const resolvedPermissions = await resolveEffectivePermissions(user.profileId, explicitPermissions, isAdmin);

  const newAccessToken = signAccessToken({
    sub: user.id,
    profileId: user.profileId,
    isAdmin,
    permissions: resolvedPermissions
  });
  const newRefreshToken = signRefreshToken(user.id);
  const newRefreshTokenHash = hashToken(newRefreshToken);
  const refreshExpiresAt = new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        isAdmin
      }
    }),
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshTokenHash,
        expiresAt: refreshExpiresAt
      }
    })
  ]);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        select: {
          key: true,
          name: true,
          isAdmin: true
        }
      },
      permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError("Usuario nao encontrado", 404);
  }

  const isAdmin = user.isAdmin || user.profile.isAdmin;
  const explicitPermissions = user.permissions.map((item) => item.permission.key);
  const resolvedPermissions = await resolveEffectivePermissions(user.profileId, explicitPermissions, isAdmin);

  return {
    user: serializeUser(user),
    permissions: resolvedPermissions
  };
}
