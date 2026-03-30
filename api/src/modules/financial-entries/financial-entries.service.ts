import fs from "fs";
import path from "path";
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
  amountPaid?: number;
  dueDate?: Date;
  installmentCount: number;
  installmentDates?: Date[];
  paymentDate?: Date;
  status?: FinancialEntryStatus;
  categoryId: string;
  costCenterId?: string;
  paymentMethodId?: string;
  paymentKey?: string;
}

interface UpdateFinancialEntryInput {
  title?: string;
  description?: string;
  amount?: number;
  amountPaid?: number | null;
  dueDate?: Date;
  paymentDate?: Date | null;
  status?: FinancialEntryStatus;
  categoryId?: string;
  costCenterId?: string | null;
  paymentMethodId?: string | null;
  paymentKey?: string | null;
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
  let resolvedCostCenterId = input.costCenterId ?? null;
  let categoryId = input.categoryId;

  if (input.categoryId) {
    const category = await prisma.financialCategory.findUnique({
      where: { id: input.categoryId },
      select: {
        id: true,
        isActive: true,
        costCenterId: true
      }
    });

    if (!category || !category.isActive) {
      throw new AppError("Categoria financeira invalida", 422);
    }

    categoryId = category.id;
    resolvedCostCenterId = input.costCenterId ?? category.costCenterId ?? null;

    if (!resolvedCostCenterId) {
      throw new AppError("Categoria financeira sem centro de custo vinculado", 422);
    }

    if (category.costCenterId && resolvedCostCenterId !== category.costCenterId) {
      throw new AppError("Categoria nao pertence ao centro de custo informado", 422);
    }
  }

  if (resolvedCostCenterId) {
    const center = await prisma.costCenter.findUnique({ where: { id: resolvedCostCenterId } });

    if (!center || !center.isActive) {
      throw new AppError("Centro de custo invalido", 422);
    }
  }

  if (input.paymentMethodId) {
    const method = await prisma.paymentMethod.findUnique({ where: { id: input.paymentMethodId } });

    if (!method || !method.isActive) {
      throw new AppError("Forma de pagamento invalida", 422);
    }

    if (/transfer/i.test(method.name)) {
      throw new AppError("Forma de pagamento 'Transferencia' foi descontinuada. Use PIX, Boleto ou outro metodo ativo.", 422);
    }
  }

  return {
    categoryId,
    costCenterId: resolvedCostCenterId,
    paymentMethodId: input.paymentMethodId ?? null
  };
}

function resolveInstallmentDates(input: CreateFinancialEntryInput): Date[] {
  if (input.installmentCount <= 1) {
    if (!input.dueDate) {
      throw new AppError("Informe a data da parcela", 422);
    }

    return [input.dueDate];
  }

  if (!input.installmentDates || input.installmentDates.length !== input.installmentCount) {
    throw new AppError("Preencha a data de todas as parcelas", 422);
  }

  return input.installmentDates;
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
  const references = await validateReferences(input);
  const installmentDates = resolveInstallmentDates(input);
  const categoryId = references.categoryId;

  if (!categoryId) {
    throw new AppError("Categoria financeira invalida", 422);
  }

  const status = input.paymentDate ? FinancialEntryStatus.PAGO : input.status ?? FinancialEntryStatus.PENDENTE;
  const amountPaid =
    status === FinancialEntryStatus.PAGO ? input.amountPaid ?? input.amount : null;

  const launchDate = new Date();
  const normalizedTitle = input.title.trim();
  const normalizedDescription = normalizeNullableText(input.description);
  const normalizedPaymentKey = normalizeNullableText(input.paymentKey);

  const entry = await prisma.$transaction(async (tx) => {
    const root = await tx.financialEntry.create({
      data: {
        title: normalizedTitle,
        description: normalizedDescription,
        amount: input.amount,
        amountPaid,
        installmentNumber: 1,
        installmentCount: input.installmentCount,
        dueDate: installmentDates[0],
        paymentDate: input.paymentDate,
        launchDate,
        status,
        categoryId,
        costCenterId: references.costCenterId,
        paymentMethodId: references.paymentMethodId,
        paymentKey: normalizedPaymentKey,
        isFixed: false,
        recurrenceCycle: FinancialRecurrenceCycle.NONE,
        recurrenceEndDate: null,
        nextRecurrenceDate: null,
        createdById: actorId
      }
    });

    for (let index = 1; index < installmentDates.length; index += 1) {
      await tx.financialEntry.create({
        data: {
          title: normalizedTitle,
          description: normalizedDescription,
          amount: input.amount,
          amountPaid,
          installmentNumber: index + 1,
          installmentCount: input.installmentCount,
          dueDate: installmentDates[index],
          paymentDate: input.paymentDate,
          launchDate,
          status,
          categoryId,
          costCenterId: references.costCenterId,
          paymentMethodId: references.paymentMethodId,
          paymentKey: normalizedPaymentKey,
          isFixed: false,
          recurrenceCycle: FinancialRecurrenceCycle.NONE,
          recurrenceEndDate: null,
          nextRecurrenceDate: null,
          parentEntryId: root.id,
          createdById: actorId
        }
      });
    }

    return tx.financialEntry.findUniqueOrThrow({
      where: { id: root.id },
      include: {
        category: true,
        costCenter: true,
        paymentMethod: true
      }
    });
  });

  await registerAuditLog({
    actorId,
    action: "FINANCIAL_ENTRY_CREATED",
    entity: "FINANCIAL_ENTRY",
    entityId: entry.id,
    payload: {
      amount: entry.amount,
      dueDate: entry.dueDate,
      installmentCount: entry.installmentCount
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

  const references = await validateReferences({
    categoryId: input.categoryId ?? current.categoryId,
    costCenterId: input.costCenterId === undefined ? current.costCenterId : input.costCenterId,
    paymentMethodId: input.paymentMethodId === undefined ? current.paymentMethodId : input.paymentMethodId
  });

  const paymentDate = input.paymentDate === undefined ? current.paymentDate : input.paymentDate;

  const nextStatus =
    paymentDate || input.status === FinancialEntryStatus.PAGO
      ? FinancialEntryStatus.PAGO
      : input.status ?? current.status;

  const dueDate = input.dueDate ?? current.dueDate;
  const amount = input.amount ?? Number(current.amount);
  const amountPaid =
    input.amountPaid === undefined
      ? nextStatus === FinancialEntryStatus.PAGO
        ? Number(current.amountPaid ?? current.amount)
        : null
      : input.amountPaid;

  const updated = await prisma.financialEntry.update({
    where: { id },
    data: {
      title: input.title?.trim(),
      description: input.description !== undefined ? normalizeNullableText(input.description) : undefined,
      amount: input.amount,
      amountPaid:
        nextStatus === FinancialEntryStatus.PAGO
          ? amountPaid ?? amount
          : null,
      dueDate,
      paymentDate,
      status: nextStatus,
      categoryId: input.categoryId === undefined ? undefined : references.categoryId,
      costCenterId: input.categoryId !== undefined || input.costCenterId !== undefined ? references.costCenterId : undefined,
      paymentMethodId:
        input.paymentMethodId === undefined ? undefined : references.paymentMethodId,
      paymentKey:
        input.paymentKey === undefined ? undefined : normalizeNullableText(input.paymentKey ?? undefined),
      isFixed: false,
      recurrenceCycle: FinancialRecurrenceCycle.NONE,
      recurrenceEndDate: null,
      nextRecurrenceDate: null
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
    amountPaid?: number;
    paymentMethodId?: string;
    paymentKey?: string;
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
      amountPaid: input.amountPaid ?? Number(current.amount),
      paymentMethodId: input.paymentMethodId ?? current.paymentMethodId,
      paymentKey: input.paymentKey ? normalizeNullableText(input.paymentKey) : current.paymentKey,
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

function resolveFileExtension(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  return extension || ".bin";
}

async function attachFinancialEntryFile(
  actorId: string,
  id: string,
  kind: "bank-slip" | "payment-receipt",
  file: Express.Multer.File
) {
  const current = await prisma.financialEntry.findUnique({ where: { id } });

  if (!current || current.deletedAt) {
    throw new AppError("Lancamento financeiro nao encontrado", 404);
  }

  const extension = resolveFileExtension(file.originalname);
  const fileName = `${kind}-${Date.now()}${extension}`;
  const absoluteDirectory = path.resolve(process.cwd(), "assets/financial-entries", id);
  const absolutePath = path.resolve(absoluteDirectory, fileName);
  const relativePath = `assets/financial-entries/${id}/${fileName}`;

  fs.mkdirSync(absoluteDirectory, { recursive: true });
  fs.writeFileSync(absolutePath, file.buffer);

  const updated = await prisma.financialEntry.update({
    where: { id },
    data:
      kind === "bank-slip"
        ? {
            bankSlipPath: relativePath,
            bankSlipMimeType: file.mimetype
          }
        : {
            paymentReceiptPath: relativePath,
            paymentReceiptMimeType: file.mimetype
          }
  });

  await registerAuditLog({
    actorId,
    action: kind === "bank-slip" ? "FINANCIAL_ENTRY_BANK_SLIP_ATTACHED" : "FINANCIAL_ENTRY_RECEIPT_ATTACHED",
    entity: "FINANCIAL_ENTRY",
    entityId: id,
    payload: {
      filePath: relativePath
    }
  });

  return updated;
}

export async function attachFinancialEntryBankSlip(
  actorId: string,
  id: string,
  file: Express.Multer.File
) {
  return attachFinancialEntryFile(actorId, id, "bank-slip", file);
}

export async function attachFinancialEntryPaymentReceipt(
  actorId: string,
  id: string,
  file: Express.Multer.File
) {
  return attachFinancialEntryFile(actorId, id, "payment-receipt", file);
}
