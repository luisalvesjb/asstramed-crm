import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { hashPassword } from "../utils/password";

function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

export async function ensureSupportAdminFromEnv(): Promise<void> {
  if (!env.SUPPORT_ADMIN_LOGIN || !env.SUPPORT_ADMIN_PASSWORD) {
    return;
  }

  const profile = await prisma.profile.findUnique({
    where: { key: "ADMIN" },
    select: { id: true, isAdmin: true }
  });

  if (!profile) {
    throw new Error("Perfil ADMIN nao encontrado para criar usuario de suporte.");
  }

  const login = normalizeLogin(env.SUPPORT_ADMIN_LOGIN);
  const passwordHash = await hashPassword(env.SUPPORT_ADMIN_PASSWORD);
  const name = env.SUPPORT_ADMIN_NAME?.trim() || "Suporte Asstramed";

  const existing = await prisma.user.findUnique({
    where: { login },
    select: { id: true }
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash,
        profileId: profile.id,
        isAdmin: true,
        isActive: true,
        isHidden: true
      }
    });

    return;
  }

  await prisma.user.create({
    data: {
      name,
      login,
      email: null,
      passwordHash,
      profileId: profile.id,
      isAdmin: true,
      isActive: true,
      isHidden: true
    }
  });
}
