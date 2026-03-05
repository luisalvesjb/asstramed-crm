import {
  FinancialEntryStatus,
  FinancialRecurrenceCycle,
  Prisma
} from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { registerAuditLog } from "../../services/audit.service";

interface ListFinancialEntriesFilters {
  dueDateFrom?: Date;
  dueDateTo?: Date;
  paymentDateFrom?: Date;
  paymentDateTo?: Date;
  launchDateFrom?: Date;
  launchDateTo?: Date;
  categoryId?: string;
  costCenterId?: string;
  paymentMethodId?: string;
  status?: FinancialEntryStatus;
  isFixed?: boolean;
  search?: string;
}

interface CreateFinancialEntryInput {
  title: string;
  description?: string;
  amount: number;
  dueDate: Date;
  paymentDate?: Date;
  launchDate?: Date;
  status?: FinancialEntryStatus;
  categoryId: string;
  costCenterId?: string;
  paymentMethodId?: string;
  isFixed: boolean;
  recurrenceCycle: FinancialRecurrenceCycle;
  recurrenceEndDate?: Date;
}

interface UpdateFinancialEntryInput {
  title?: string;
  description?: string;
  amount?: number;
  dueDate?: Date;
  paymentDate?: Date | null;
  launchDate?: Date;
  status?: FinancialEntryStatus;
  categoryId?: string;
  costCenterId?: string | null;
  paymentMethodId?: string | null;
  isFixed?: boolean;
  recurrenceCycle?: FinancialRecurrenceCycle;
  recurrenceEndDate?: Date | null;
}

function normalizeNullableText(value?: string): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function buildRange(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  return {
    gte: from ? startOfDay(from) : undefined,
    lte: to ? endOfDay(to) : undefined
  };
}

function addCycle(date: Date, cycle: FinancialRecurrenceCycle): Date {
  const value = new Date(date);

  switch (cycle) {
    case FinancialRecurrenceCycle.WEEKLY:
      value.setDate(value.getDate() + 7);
      return value;
    case FinancialRecurrenceCycle.MONTHLY:
      value.setMonth(value.getMonth() + 1);
      return value;
    case FinancialRecurrenceCycle.QUARTERLY:
      value.setMonth(value.getMonth() + 3);
      return value;
    case FinancialRecurrenceCycle.SEMIANNUAL:
      value.setMonth(value.getMonth() + 6);
      return value;
    case FinancialRecurrenceCycle.YEARLY:
      value.setFullYear(value.getFullYear() + 1);
      return value;
    case FinancialRecurrenceCycle.NONE:
    default:
      return value;
  }
}

async function validateReferences(input: {
  categoryId?: string;
  costCenterId?: string | null;
  paymentMethodId?: string | null;
}) {
  if (input.categoryId) {
    const category = await prisma.financialCategory.findUnique({ where: { id: input.categoryId } });

    if (!category || !category.isActive) {
      throw new AppError("Categoria financeira invalida", 422);
    }
  }

  if (input.costCenterId) {
    const center = await prisma.costCenter.findUnique({ where: { id: input.costCenterId } });

    if (!center || !center.isActive) {
      throw new AppError("Centro de custo invalido", 422);
    }
  }

  if (input.paymentMethodId) {
    const method = await prisma.paymentMethod.findUnique({ where: { id: input.paymentMethodId } });

    if (!method || !method.isActive) {
      throw new AppError("Forma de pagamento invalida", 422);
    }
  }
}

async function syncOverdueStatuses(): Promise<void> {
  const now = new Date();

  await prisma.financialEntry.updateMany({
    where: {
      deletedAt: null,
      status: FinancialEntryStatus.PENDENTE,
      dueDate: {
        lt: now
      }
    },
    data: {
      status: FinancialEntryStatus.VENCIDO
    }
  });
}

export async function ensureRecurringEntriesGenerated(untilDate: Date): Promise<void> {
  const roots = await prisma.financialEntry.findMany({
    where: {
      deletedAt: null,
      parentEntryId: null,
      isFixed: true,
      recurrenceCycle: {
        not: FinancialRecurrenceCycle.NONE
      },
      nextRecurrenceDate: {
        lte: untilDate
      }
    },
    orderBy: { createdAt: "asc" }
  });

  for (const root of roots) {
    let nextDate = root.nextRecurrenceDate;

    while (
      nextDate &&
      nextDate <= untilDate &&
      (!root.recurrenceEndDate || nextDate <= root.recurrenceEndDate)
    ) {
      const existingChild = await prisma.financialEntry.findFirst({
        where: {
          deletedAt: null,
          parentEntryId: root.id,
          dueDate: nextDate
        },
        select: { id: true }
      });

      if (!existingChild) {
        await prisma.financialEntry.create({
          data: {
            title: root.title,
            description: root.description,
            amount: root.amount,
            dueDate: nextDate,
            launchDate: nextDate,
            status: FinancialEntryStatus.PENDENTE,
            categoryId: root.categoryId,
            costCenterId: root.costCenterId,
            paymentMethodId: root.paymentMethodId,
            isFixed: false,
            recurrenceCycle: FinancialRecurrenceCycle.NONE,
            parentEntryId: root.id,
            createdById: root.createdById
          }
        });
      }

      nextDate = addCycle(nextDate, root.recurrenceCycle);
    }

    const shouldStop = Boolean(root.recurrenceEndDate && nextDate && nextDate > root.recurrenceEndDate);

    await prisma.financialEntry.update({
      where: { id: root.id },
      data: {
        nextRecurrenceDate: shouldStop ? null : nextDate
      }
    });
  }
}

export async function listFinancialEntries(filters: ListFinancialEntriesFilters) {
  const recurrenceUntil = endOfDay(filters.dueDateTo ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 60));

  await Promise.all([ensureRecurringEntriesGenerated(recurrenceUntil), syncOverdueStatuses()]);

  return prisma.financialEntry.findMany({
    where: {
      deletedAt: null,
      dueDate: buildRange(filters.dueDateFrom, filters.dueDateTo),
      paymentDate: buildRange(filters.paymentDateFrom, filters.paymentDateTo),
      launchDate: buildRange(filters.launchDateFrom, filters.launchDateTo),
      categoryId: filters.categoryId,
      costCenterId: filters.costCenterId,
      paymentMethodId: filters.paymentMethodId,
      status: filters.status,
      isFixed: filters.isFixed,
      OR: filters.search
        ? [
            {
              title: {
                contains: filters.search,
                mode: "insensitive"
              }
            },
            {
              description: {
                contains: filters.search,
                mode: "insensitive"
              }
            }
          ]
        : undefined
    },
    include: {
      category: true,
      costCenter: true,
      paymentMethod: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      parentEntry: {
        select: {
          id: true,
          title: true,
          dueDate: true
        }
      }
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
  });
}

export async function createFinancialEntry(actorId: string, input: CreateFinancialEntryInput) {
  await validateReferences(input);

  if (input.isFixed && input.recurrenceCycle === FinancialRecurrenceCycle.NONE) {
    throw new AppError("Lancamento fixo deve informar ciclo de repeticao", 422);
  }

  if (!input.isFixed && input.recurrenceCycle !== FinancialRecurrenceCycle.NONE) {
    throw new AppError("Lancamento nao fixo nao pode ter ciclo de repeticao", 422);
  }

  const status = input.paymentDate ? FinancialEntryStatus.PAGO : input.status ?? FinancialEntryStatus.PENDENTE;

  const entry = await prisma.financialEntry.create({
    data: {
      title: input.title.trim(),
      description: normalizeNullableText(input.description),
      amount: input.amount,
      dueDate: input.dueDate,
      paymentDate: input.paymentDate,
      launchDate: input.launchDate ?? new Date(),
      status,
      categoryId: input.categoryId,
      costCenterId: input.costCenterId,
      paymentMethodId: input.paymentMethodId,
      isFixed: input.isFixed,
      recurrenceCycle: input.recurrenceCycle,
      recurrenceEndDate: input.recurrenceEndDate,
      nextRecurrenceDate:
        input.isFixed && input.recurrenceCycle !== FinancialRecurrenceCycle.NONE
          ? addCycle(input.dueDate, input.recurrenceCycle)
          : null,
      createdById: actorId
    },
    include: {
      category: true,
      costCenter: true,
      paymentMethod: true
    }
  });

  await registerAuditLog({
    actorId,
    action: "FINANCIAL_ENTRY_CREATED",
    entity: "FINANCIAL_ENTRY",
    entityId: entry.id,
    payload: {
      amount: entry.amount,
      dueDate: entry.dueDate,
      isFixed: entry.isFixed,
      recurrenceCycle: entry.recurrenceCycle
    }
  });

  return entry;
}

export async function updateFinancialEntry(
  actorId: string,
  id: string,
  input: UpdateFinancialEntryInput
) {
  const current = await prisma.financialEntry.findUnique({ where: { id } });

  if (!current || current.deletedAt) {
    throw new AppError("Lancamento financeiro nao encontrado", 404);
  }

  await validateReferences({
    categoryId: input.categoryId,
    costCenterId: input.costCenterId,
    paymentMethodId: input.paymentMethodId
  });

  const nextIsFixed = input.isFixed ?? current.isFixed;
  const nextCycle = input.recurrenceCycle ?? current.recurrenceCycle;

  if (nextIsFixed && nextCycle === FinancialRecurrenceCycle.NONE) {
    throw new AppError("Lancamento fixo deve informar ciclo de repeticao", 422);
  }

  const paymentDate = input.paymentDate === undefined ? current.paymentDate : input.paymentDate;

  const nextStatus = paymentDate
    ? FinancialEntryStatus.PAGO
    : input.status ?? current.status;

  const dueDate = input.dueDate ?? current.dueDate;

  const updated = await prisma.financialEntry.update({
    where: { id },
    data: {
      title: input.title?.trim(),
      description: input.description !== undefined ? normalizeNullableText(input.description) : undefined,
      amount: input.amount,
      dueDate,
      paymentDate,
      launchDate: input.launchDate,
      status: nextStatus,
      categoryId: input.categoryId,
      costCenterId: input.costCenterId === undefined ? undefined : input.costCenterId,
      paymentMethodId: input.paymentMethodId === undefined ? undefined : input.paymentMethodId,
      isFixed: nextIsFixed,
      recurrenceCycle: nextCycle,
      recurrenceEndDate:
        input.recurrenceEndDate === undefined ? undefined : input.recurrenceEndDate,
      nextRecurrenceDate:
        nextIsFixed && nextCycle !== FinancialRecurrenceCycle.NONE
          ? addCycle(dueDate, nextCycle)
          : null
    },
    include: {
      category: true,
      costCenter: true,
      paymentMethod: true
    }
  });

  await registerAuditLog({
    actorId,
    action: "FINANCIAL_ENTRY_UPDATED",
    entity: "FINANCIAL_ENTRY",
    entityId: id
  });

  return updated;
}

export async function markFinancialEntryAsPaid(
  actorId: string,
  id: string,
  input: {
    paymentDate?: Date;
    paymentMethodId?: string;
  }
) {
  const current = await prisma.financialEntry.findUnique({ where: { id } });

  if (!current || current.deletedAt) {
    throw new AppError("Lancamento financeiro nao encontrado", 404);
  }

  if (input.paymentMethodId) {
    await validateReferences({ paymentMethodId: input.paymentMethodId });
  }

  const paid = await prisma.financialEntry.update({
    where: { id },
    data: {
      paymentDate: input.paymentDate ?? new Date(),
      paymentMethodId: input.paymentMethodId ?? current.paymentMethodId,
      status: FinancialEntryStatus.PAGO
    },
    include: {
      category: true,
      costCenter: true,
      paymentMethod: true
    }
  });

  await registerAuditLog({
    actorId,
    action: "FINANCIAL_ENTRY_MARKED_PAID",
    entity: "FINANCIAL_ENTRY",
    entityId: id,
    payload: {
      paymentDate: paid.paymentDate
    }
  });

  return paid;
}

export async function deleteFinancialEntry(actorId: string, id: string) {
  const current = await prisma.financialEntry.findUnique({ where: { id } });

  if (!current || current.deletedAt) {
    throw new AppError("Lancamento financeiro nao encontrado", 404);
  }

  const deleted = await prisma.financialEntry.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: FinancialEntryStatus.CANCELADO
    }
  });

  await registerAuditLog({
    actorId,
    action: "FINANCIAL_ENTRY_DELETED",
    entity: "FINANCIAL_ENTRY",
    entityId: id
  });

  return deleted;
}
