import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { registerAuditLog } from "../../services/audit.service";

interface FinancialSettingInput {
  name: string;
  description?: string;
  isActive?: boolean;
  costCenterId?: string;
}

interface FinancialSettingUpdateInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  costCenterId?: string | null;
}

interface FinancialSettingListFilters {
  status?: "active" | "inactive" | "all";
  includeUsedInactive?: boolean;
  costCenterId?: string;
}

function normalizeNullable(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildCategoryWhere(filters?: FinancialSettingListFilters) {
  const status = filters?.status ?? "active";
  const includeUsedInactive = filters?.includeUsedInactive ?? false;
  const baseWhere = filters?.costCenterId ? { costCenterId: filters.costCenterId } : {};

  if (status === "inactive") {
    return { ...baseWhere, isActive: false };
  }

  if (status === "all") {
    return Object.keys(baseWhere).length ? baseWhere : undefined;
  }

  if (!includeUsedInactive) {
    return { ...baseWhere, isActive: true };
  }

  return {
    ...baseWhere,
    OR: [
      { isActive: true },
      {
        isActive: false,
        entries: {
          some: {
            deletedAt: null
          }
        }
      }
    ]
  };
}

function buildCostCenterWhere(filters?: FinancialSettingListFilters) {
  const status = filters?.status ?? "active";
  const includeUsedInactive = filters?.includeUsedInactive ?? false;

  if (status === "inactive") {
    return { isActive: false };
  }

  if (status === "all") {
    return undefined;
  }

  if (!includeUsedInactive) {
    return { isActive: true };
  }

  return {
    OR: [
      { isActive: true },
      {
        isActive: false,
        entries: {
          some: {
            deletedAt: null
          }
        }
      }
    ]
  };
}

function buildPaymentMethodWhere(filters?: FinancialSettingListFilters) {
  const status = filters?.status ?? "active";
  const includeUsedInactive = filters?.includeUsedInactive ?? false;

  if (status === "inactive") {
    return { isActive: false };
  }

  if (status === "all") {
    return undefined;
  }

  if (!includeUsedInactive) {
    return { isActive: true };
  }

  return {
    OR: [
      { isActive: true },
      {
        isActive: false,
        entries: {
          some: {
            deletedAt: null
          }
        }
      }
    ]
  };
}

function ensureNotTransferPaymentMethodName(name: string) {
  if (/transfer/i.test(name)) {
    throw new AppError("Forma de pagamento 'Transferencia' foi descontinuada. Use PIX ou Boleto.", 422);
  }
}

export async function listCategories(filters?: FinancialSettingListFilters) {
  return prisma.financialCategory.findMany({
    where: buildCategoryWhere(filters),
    include: {
      costCenter: true
    },
    orderBy: { name: "asc" }
  });
}

export async function createCategory(actorId: string, input: FinancialSettingInput) {
  if (!input.costCenterId) {
    throw new AppError("Selecione o centro de custo da categoria", 422);
  }

  const center = await prisma.costCenter.findUnique({ where: { id: input.costCenterId } });

  if (!center || !center.isActive) {
    throw new AppError("Centro de custo invalido para a categoria", 422);
  }

  const exists = await prisma.financialCategory.findFirst({
    where: {
      name: {
        equals: input.name.trim(),
        mode: "insensitive"
      }
    }
  });

  if (exists) {
    throw new AppError("Categoria financeira ja cadastrada", 409);
  }

  const category = await prisma.financialCategory.create({
    data: {
      name: input.name.trim(),
      description: normalizeNullable(input.description),
      costCenterId: input.costCenterId,
      isActive: input.isActive ?? true
    },
    include: {
      costCenter: true
    }
  });

  await registerAuditLog({
    actorId,
    action: "FINANCIAL_CATEGORY_CREATED",
    entity: "FINANCIAL_CATEGORY",
    entityId: category.id
  });

  return category;
}

export async function updateCategory(actorId: string, id: string, input: FinancialSettingUpdateInput) {
  const current = await prisma.financialCategory.findUnique({ where: { id } });

  if (!current) {
    throw new AppError("Categoria financeira nao encontrada", 404);
  }

  if (input.costCenterId !== undefined) {
    if (!input.costCenterId) {
      throw new AppError("Selecione o centro de custo da categoria", 422);
    }

    const center = await prisma.costCenter.findUnique({ where: { id: input.costCenterId } });

    if (!center || !center.isActive) {
      throw new AppError("Centro de custo invalido para a categoria", 422);
    }
  }

  const nextName = input.name?.trim();

  if (nextName && nextName.toLowerCase() !== current.name.toLowerCase()) {
    const exists = await prisma.financialCategory.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: nextName,
          mode: "insensitive"
        }
      }
    });

    if (exists) {
      throw new AppError("Categoria financeira ja cadastrada", 409);
    }
  }

  const updated = await prisma.financialCategory.update({
    where: { id },
    data: {
      name: nextName,
      description: input.description !== undefined ? normalizeNullable(input.description) : undefined,
      costCenterId: input.costCenterId === undefined ? undefined : input.costCenterId,
      isActive: input.isActive
    },
    include: {
      costCenter: true
    }
  });

  await registerAuditLog({
    actorId,
    action: "FINANCIAL_CATEGORY_UPDATED",
    entity: "FINANCIAL_CATEGORY",
    entityId: id
  });

  return updated;
}

export async function listCostCenters(filters?: FinancialSettingListFilters) {
  return prisma.costCenter.findMany({
    where: buildCostCenterWhere(filters),
    orderBy: { name: "asc" }
  });
}

export async function createCostCenter(actorId: string, input: FinancialSettingInput) {
  const exists = await prisma.costCenter.findFirst({
    where: {
      name: {
        equals: input.name.trim(),
        mode: "insensitive"
      }
    }
  });

  if (exists) {
    throw new AppError("Centro de custo ja cadastrado", 409);
  }

  const center = await prisma.costCenter.create({
    data: {
      name: input.name.trim(),
      description: normalizeNullable(input.description),
      isActive: input.isActive ?? true
    }
  });

  await registerAuditLog({
    actorId,
    action: "COST_CENTER_CREATED",
    entity: "COST_CENTER",
    entityId: center.id
  });

  return center;
}

export async function updateCostCenter(actorId: string, id: string, input: FinancialSettingUpdateInput) {
  const current = await prisma.costCenter.findUnique({ where: { id } });

  if (!current) {
    throw new AppError("Centro de custo nao encontrado", 404);
  }

  const nextName = input.name?.trim();

  if (nextName && nextName.toLowerCase() !== current.name.toLowerCase()) {
    const exists = await prisma.costCenter.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: nextName,
          mode: "insensitive"
        }
      }
    });

    if (exists) {
      throw new AppError("Centro de custo ja cadastrado", 409);
    }
  }

  const updated = await prisma.costCenter.update({
    where: { id },
    data: {
      name: nextName,
      description: input.description !== undefined ? normalizeNullable(input.description) : undefined,
      isActive: input.isActive
    }
  });

  await registerAuditLog({
    actorId,
    action: "COST_CENTER_UPDATED",
    entity: "COST_CENTER",
    entityId: id
  });

  return updated;
}

export async function listPaymentMethods(filters?: FinancialSettingListFilters) {
  return prisma.paymentMethod.findMany({
    where: buildPaymentMethodWhere(filters),
    orderBy: { name: "asc" }
  });
}

export async function createPaymentMethod(actorId: string, input: FinancialSettingInput) {
  const normalizedName = input.name.trim();
  ensureNotTransferPaymentMethodName(normalizedName);

  const exists = await prisma.paymentMethod.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: "insensitive"
      }
    }
  });

  if (exists) {
    throw new AppError("Forma de pagamento ja cadastrada", 409);
  }

  const method = await prisma.paymentMethod.create({
    data: {
      name: normalizedName,
      description: normalizeNullable(input.description),
      isActive: input.isActive ?? true
    }
  });

  await registerAuditLog({
    actorId,
    action: "PAYMENT_METHOD_CREATED",
    entity: "PAYMENT_METHOD",
    entityId: method.id
  });

  return method;
}

export async function updatePaymentMethod(actorId: string, id: string, input: FinancialSettingUpdateInput) {
  const current = await prisma.paymentMethod.findUnique({ where: { id } });

  if (!current) {
    throw new AppError("Forma de pagamento nao encontrada", 404);
  }

  const nextName = input.name?.trim();

  if (nextName) {
    ensureNotTransferPaymentMethodName(nextName);
  }

  if (nextName && nextName.toLowerCase() !== current.name.toLowerCase()) {
    const exists = await prisma.paymentMethod.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: nextName,
          mode: "insensitive"
        }
      }
    });

    if (exists) {
      throw new AppError("Forma de pagamento ja cadastrada", 409);
    }
  }

  const updated = await prisma.paymentMethod.update({
    where: { id },
    data: {
      name: nextName,
      description: input.description !== undefined ? normalizeNullable(input.description) : undefined,
      isActive: input.isActive
    }
  });

  await registerAuditLog({
    actorId,
    action: "PAYMENT_METHOD_UPDATED",
    entity: "PAYMENT_METHOD",
    entityId: id
  });

  return updated;
}

export async function deactivateCategory(actorId: string, id: string) {
  const current = await prisma.financialCategory.findUnique({ where: { id } });

  if (!current) {
    throw new AppError("Categoria financeira nao encontrada", 404);
  }

  const updated = await prisma.financialCategory.update({
    where: { id },
    data: {
      isActive: false
    }
  });

  await registerAuditLog({
    actorId,
    action: "FINANCIAL_CATEGORY_DEACTIVATED",
    entity: "FINANCIAL_CATEGORY",
    entityId: id
  });

  return updated;
}

export async function deactivateCostCenter(actorId: string, id: string) {
  const current = await prisma.costCenter.findUnique({ where: { id } });

  if (!current) {
    throw new AppError("Centro de custo nao encontrado", 404);
  }

  const updated = await prisma.costCenter.update({
    where: { id },
    data: {
      isActive: false
    }
  });

  await registerAuditLog({
    actorId,
    action: "COST_CENTER_DEACTIVATED",
    entity: "COST_CENTER",
    entityId: id
  });

  return updated;
}

export async function deactivatePaymentMethod(actorId: string, id: string) {
  const current = await prisma.paymentMethod.findUnique({ where: { id } });

  if (!current) {
    throw new AppError("Forma de pagamento nao encontrada", 404);
  }

  const updated = await prisma.paymentMethod.update({
    where: { id },
    data: {
      isActive: false
    }
  });

  await registerAuditLog({
    actorId,
    action: "PAYMENT_METHOD_DEACTIVATED",
    entity: "PAYMENT_METHOD",
    entityId: id
  });

  return updated;
}
