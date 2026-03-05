import { prisma } from "../db/prisma";
import {
  ALL_PERMISSION_KEYS,
  SYSTEM_PROFILE_TEMPLATES,
  getSystemProfileTemplateByKey
} from "../config/permissions";
import { AppError } from "../errors/app-error";

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "dashboard.read": "Visualizar dashboard",
  "activities.read": "Visualizar atividades",
  "activities.create": "Criar atividades",
  "activities.finish": "Concluir ou alterar status de atividades",
  "companies.read": "Visualizar empresas",
  "companies.write": "Cadastrar e editar dados de empresas",
  "documents.read": "Visualizar documentos",
  "documents.write": "Enviar e arquivar documentos",
  "contracts.read": "Visualizar contratos",
  "contracts.write": "Criar contratos",
  "contracts.values.read": "Visualizar valores contratuais",
  "users.read": "Visualizar usuarios",
  "users.write": "Criar e alterar usuarios",
  "users.profile.edit": "Editar dados e perfil de usuarios",
  "users.activate": "Ativar e inativar usuarios",
  "users.delete": "Excluir usuarios",
  "permissions.manage": "Gerenciar feature flags e permissoes",
  "reports.read": "Visualizar relatorios",
  "finance.read": "Visualizar financeiro",
  "finance.write": "Criar e editar lancamentos financeiros",
  "finance.settings": "Gerenciar categorias e parametros financeiros",
  "finance.reports": "Visualizar relatorios financeiros"
};

export async function syncPermissionCatalog(): Promise<void> {
  await Promise.all(
    ALL_PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: { description: PERMISSION_DESCRIPTIONS[key] ?? key },
        create: {
          key,
          description: PERMISSION_DESCRIPTIONS[key] ?? key
        }
      })
    )
  );
}

export async function syncSystemProfiles(): Promise<void> {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: ALL_PERMISSION_KEYS } },
    select: { id: true, key: true }
  });

  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

  for (const template of SYSTEM_PROFILE_TEMPLATES) {
    const profile = await prisma.profile.upsert({
      where: { key: template.key },
      update: {
        name: template.name,
        description: template.description,
        isAdmin: template.isAdmin,
        isSystem: true,
        isActive: true
      },
      create: {
        key: template.key,
        name: template.name,
        description: template.description,
        isAdmin: template.isAdmin,
        isSystem: true,
        isActive: true
      }
    });

    const existingCount = await prisma.profilePermission.count({
      where: { profileId: profile.id }
    });

    if (existingCount === 0) {
      const permissionIds = template.permissions
        .map((permissionKey) => permissionIdByKey.get(permissionKey))
        .filter((permissionId): permissionId is string => Boolean(permissionId));

      if (permissionIds.length > 0) {
        await prisma.profilePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            profileId: profile.id,
            permissionId
          })),
          skipDuplicates: true
        });
      }
    }
  }

  await prisma.user.updateMany({
    data: {
      isAdmin: false
    }
  });

  await prisma.user.updateMany({
    where: {
      profile: { isAdmin: true }
    },
    data: {
      isAdmin: true
    }
  });
}

export async function getUserExplicitPermissionKeys(userId: string): Promise<string[]> {
  const userPermissions = await prisma.userPermission.findMany({
    where: { userId },
    include: { permission: true }
  });

  return userPermissions.map((item) => item.permission.key);
}

export async function setUserPermissions(userId: string, permissionKeys: string[]): Promise<void> {
  const uniqueKeys = [...new Set(permissionKeys)];

  const permissions = await prisma.permission.findMany({
    where: { key: { in: uniqueKeys } }
  });

  if (permissions.length !== uniqueKeys.length) {
    throw new AppError("Uma ou mais permissoes sao invalidas", 422);
  }

  await prisma.userPermission.deleteMany({ where: { userId } });

  if (permissions.length === 0) {
    return;
  }

  await prisma.userPermission.createMany({
    data: permissions.map((permission) => ({
      userId,
      permissionId: permission.id
    }))
  });
}

export async function getProfilePermissionKeys(profileId: string): Promise<string[]> {
  const profilePermissions = await prisma.profilePermission.findMany({
    where: { profileId },
    include: { permission: true },
    orderBy: { permission: { key: "asc" } }
  });

  return profilePermissions.map((item) => item.permission.key);
}

export async function resolveEffectivePermissions(
  profileId: string,
  explicitPermissions: string[],
  isAdmin = false
): Promise<string[]> {
  if (isAdmin) {
    return ALL_PERMISSION_KEYS;
  }

  const profilePermissionKeys = await getProfilePermissionKeys(profileId);
  const set = new Set<string>([...profilePermissionKeys, ...explicitPermissions]);
  return [...set];
}

export async function setProfilePermissions(profileId: string, permissionKeys: string[]): Promise<void> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true }
  });

  if (!profile) {
    throw new AppError("Perfil nao encontrado", 404);
  }

  const uniqueKeys = [...new Set(permissionKeys)];
  const permissions = await prisma.permission.findMany({
    where: { key: { in: uniqueKeys } }
  });

  if (permissions.length !== uniqueKeys.length) {
    throw new AppError("Uma ou mais permissoes sao invalidas", 422);
  }

  await prisma.profilePermission.deleteMany({ where: { profileId } });

  if (permissions.length === 0) {
    return;
  }

  await prisma.profilePermission.createMany({
    data: permissions.map((permission) => ({
      profileId,
      permissionId: permission.id
    }))
  });
}

export async function seedSystemProfilePermissions(profileId: string, profileKey: string): Promise<void> {
  const template = getSystemProfileTemplateByKey(profileKey);

  if (!template) {
    return;
  }

  const currentCount = await prisma.profilePermission.count({
    where: { profileId }
  });

  if (currentCount > 0) {
    return;
  }

  const permissions = await prisma.permission.findMany({
    where: { key: { in: template.permissions } },
    select: { id: true, key: true }
  });

  if (permissions.length === 0) {
    return;
  }

  await prisma.profilePermission.createMany({
    data: permissions.map((permission) => ({
      profileId,
      permissionId: permission.id
    })),
    skipDuplicates: true
  });
}
