import {
  CashBoxStatus,
  CashMovementType,
  CashReceiptCategory,
  Prisma
} from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { registerAuditLog } from "../../services/audit.service";
import { comparePassword } from "../../utils/password";

const RECEIPT_CATEGORY_LABELS: Record<CashReceiptCategory, string> = {
  PIX: "PIX",
  CARTAO_CREDITO: "Cartao credito",
  CARTAO_DEBITO: "Cartao debito",
  DINHEIRO: "Dinheiro"
};

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

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function normalizeText(value?: string): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function movementFactor(type: CashMovementType): number {
  switch (type) {
    case CashMovementType.RECEBIMENTO:
    case CashMovementType.SUPRIMENTO:
    case CashMovementType.AJUSTE_POSITIVO:
      return 1;
    case CashMovementType.SAIDA:
    case CashMovementType.SANGRIA:
    case CashMovementType.AJUSTE_NEGATIVO:
    default:
      return -1;
  }
}

function shouldRestrictToCash(type: CashMovementType): boolean {
  const cashOnlyTypes: CashMovementType[] = [
    CashMovementType.SANGRIA,
    CashMovementType.SUPRIMENTO,
    CashMovementType.AJUSTE_POSITIVO,
    CashMovementType.AJUSTE_NEGATIVO
  ];

  return cashOnlyTypes.includes(type);
}

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  return Number(value ?? 0);
}

function createEmptyCategoryRows() {
  return [
    CashReceiptCategory.PIX,
    CashReceiptCategory.CARTAO_CREDITO,
    CashReceiptCategory.CARTAO_DEBITO,
    CashReceiptCategory.DINHEIRO
  ].map((category) => ({
    category,
    label: RECEIPT_CATEGORY_LABELS[category],
    inflow: 0,
    outflow: 0,
    balance: 0
  }));
}

function summarizeByCategory(
  movements: Array<{
    type: CashMovementType;
    receiptCategory: CashReceiptCategory;
    amount: Prisma.Decimal | number;
  }>
) {
  const rows = createEmptyCategoryRows();
  const byCategory = new Map(rows.map((row) => [row.category, row]));

  for (const movement of movements) {
    const amount = toNumber(movement.amount);
    const factor = movementFactor(movement.type);
    const row = byCategory.get(movement.receiptCategory);

    if (!row) {
      continue;
    }

    if (factor > 0) {
      row.inflow += amount;
    } else {
      row.outflow += amount;
    }

    row.balance += factor * amount;
  }

  return rows;
}

function resolvePhysicalBalance(openingAmount: number, rows: Array<{ category: CashReceiptCategory; balance: number }>): number {
  const moneyRow = rows.find((row) => row.category === CashReceiptCategory.DINHEIRO);
  return openingAmount + (moneyRow?.balance ?? 0);
}

async function findCashBoxOrFail(id: string) {
  const cashBox = await prisma.cashBox.findUnique({
    where: { id },
    include: {
      openedBy: {
        select: {
          id: true,
          name: true
        }
      },
      closedBy: {
        select: {
          id: true,
          name: true
        }
      },
      movements: {
        orderBy: {
          createdAt: "asc"
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  if (!cashBox) {
    throw new AppError("Caixa diario nao encontrado", 404);
  }

  return cashBox;
}

function serializeCashBox(cashBox: Awaited<ReturnType<typeof findCashBoxOrFail>>) {
  const dailyByCategory = summarizeByCategory(cashBox.movements);
  const openingAmount = toNumber(cashBox.openingAmount);
  const expectedBalance =
    cashBox.status === CashBoxStatus.FECHADO && cashBox.closingAmountExpected != null
      ? toNumber(cashBox.closingAmountExpected)
      : resolvePhysicalBalance(openingAmount, dailyByCategory);

  return {
    id: cashBox.id,
    referenceDate: cashBox.referenceDate,
    status: cashBox.status,
    openingAmount,
    openingNotes: cashBox.openingNotes,
    openedAt: cashBox.openedAt,
    openedBy: cashBox.openedBy,
    closingAmountExpected:
      cashBox.closingAmountExpected != null ? toNumber(cashBox.closingAmountExpected) : expectedBalance,
    closingAmountCounted:
      cashBox.closingAmountCounted != null ? toNumber(cashBox.closingAmountCounted) : null,
    differenceAmount: cashBox.differenceAmount != null ? toNumber(cashBox.differenceAmount) : null,
    closingNotes: cashBox.closingNotes,
    closedAt: cashBox.closedAt,
    closedBy: cashBox.closedBy,
    physicalBalance: expectedBalance,
    dailyByCategory,
    movements: cashBox.movements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      receiptCategory: movement.receiptCategory,
      amount: toNumber(movement.amount),
      description: movement.description,
      reference: movement.reference,
      createdAt: movement.createdAt,
      createdBy: movement.createdBy
    }))
  };
}

export async function getCashOverview(input: { date?: Date }) {
  const referenceDate = startOfDay(input.date ?? new Date());
  const referenceEnd = endOfDay(referenceDate);
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);

  const [currentBoxRaw, monthlyMovements, recentBoxesRaw] = await Promise.all([
    prisma.cashBox.findFirst({
      where: {
        referenceDate: {
          gte: referenceDate,
          lte: referenceEnd
        }
      },
      include: {
        openedBy: {
          select: {
            id: true,
            name: true
          }
        },
        closedBy: {
          select: {
            id: true,
            name: true
          }
        },
        movements: {
          orderBy: {
            createdAt: "asc"
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }),
    prisma.cashMovement.findMany({
      where: {
        cashBox: {
          referenceDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      }
    }),
    prisma.cashBox.findMany({
      orderBy: {
        referenceDate: "desc"
      },
      take: 10,
      include: {
        openedBy: {
          select: {
            id: true,
            name: true
          }
        },
        closedBy: {
          select: {
            id: true,
            name: true
          }
        },
        movements: true
      }
    })
  ]);

  const currentBox = currentBoxRaw ? serializeCashBox(currentBoxRaw) : null;
  const monthlyByCategory = summarizeByCategory(monthlyMovements);
  const recentBoxes = recentBoxesRaw.map((cashBox) => {
    const rows = summarizeByCategory(cashBox.movements);
    const openingAmount = toNumber(cashBox.openingAmount);
    const physicalBalance =
      cashBox.status === CashBoxStatus.FECHADO && cashBox.closingAmountExpected != null
        ? toNumber(cashBox.closingAmountExpected)
        : resolvePhysicalBalance(openingAmount, rows);

    return {
      id: cashBox.id,
      referenceDate: cashBox.referenceDate,
      status: cashBox.status,
      openingAmount,
      openedAt: cashBox.openedAt,
      openedBy: cashBox.openedBy,
      closedAt: cashBox.closedAt,
      closedBy: cashBox.closedBy,
      physicalBalance,
      movementCount: cashBox.movements.length,
      closingAmountCounted: cashBox.closingAmountCounted != null ? toNumber(cashBox.closingAmountCounted) : null,
      differenceAmount: cashBox.differenceAmount != null ? toNumber(cashBox.differenceAmount) : null
    };
  });

  const dailyPhysicalBalance = currentBox?.physicalBalance ?? 0;
  const monthlyPhysicalBalance = monthlyByCategory.find((item) => item.category === CashReceiptCategory.DINHEIRO)?.balance ?? 0;

  return {
    referenceDate,
    currentBox,
    summary: {
      dailyPhysicalBalance,
      monthlyPhysicalBalance,
      hasOpenCashBox: currentBox?.status === CashBoxStatus.ABERTO,
      dailyByCategory: currentBox?.dailyByCategory ?? createEmptyCategoryRows(),
      monthlyByCategory
    },
    recentBoxes
  };
}

export async function openCashBox(
  actorId: string,
  input: {
    date?: Date;
    openingAmount: number;
    openingNotes?: string;
  }
) {
  const referenceDate = startOfDay(input.date ?? new Date());
  const referenceEnd = endOfDay(referenceDate);

  const existing = await prisma.cashBox.findFirst({
    where: {
      referenceDate: {
        gte: referenceDate,
        lte: referenceEnd
      }
    },
    select: { id: true, status: true }
  });

  if (existing) {
    throw new AppError("Ja existe um caixa diario para esta data", 409);
  }

  const cashBox = await prisma.cashBox.create({
    data: {
      referenceDate,
      openingAmount: input.openingAmount,
      openingNotes: normalizeText(input.openingNotes),
      openedById: actorId,
      status: CashBoxStatus.ABERTO
    }
  });

  await registerAuditLog({
    actorId,
    action: "CASH_BOX_OPENED",
    entity: "CASH_BOX",
    entityId: cashBox.id,
    payload: {
      referenceDate,
      openingAmount: input.openingAmount
    }
  });

  return findCashBoxOrFail(cashBox.id).then(serializeCashBox);
}

export async function addCashMovement(
  actorId: string,
  cashBoxId: string,
  input: {
    type: CashMovementType;
    receiptCategory: CashReceiptCategory;
    amount: number;
    description?: string;
    reference?: string;
  }
) {
  const cashBox = await prisma.cashBox.findUnique({
    where: { id: cashBoxId },
    select: { id: true, status: true, referenceDate: true }
  });

  if (!cashBox) {
    throw new AppError("Caixa diario nao encontrado", 404);
  }

  if (cashBox.status !== CashBoxStatus.ABERTO) {
    throw new AppError("Nao e possivel lancar movimentacoes em um caixa fechado", 422);
  }

  if (shouldRestrictToCash(input.type) && input.receiptCategory !== CashReceiptCategory.DINHEIRO) {
    throw new AppError("Sangria, suprimento e ajustes devem usar a categoria Dinheiro", 422);
  }

  await prisma.cashMovement.create({
    data: {
      cashBoxId,
      type: input.type,
      receiptCategory: input.receiptCategory,
      amount: input.amount,
      description: normalizeText(input.description),
      reference: normalizeText(input.reference),
      createdById: actorId
    }
  });

  await registerAuditLog({
    actorId,
    action: "CASH_MOVEMENT_CREATED",
    entity: "CASH_BOX",
    entityId: cashBoxId,
    payload: {
      type: input.type,
      receiptCategory: input.receiptCategory,
      amount: input.amount
    }
  });

  return findCashBoxOrFail(cashBoxId).then(serializeCashBox);
}

export async function closeCashBox(
  actorId: string,
  cashBoxId: string,
  input: {
    password: string;
    countedAmount: number;
    closingNotes?: string;
  }
) {
  const cashBox = await findCashBoxOrFail(cashBoxId);

  if (cashBox.status === CashBoxStatus.FECHADO) {
    throw new AppError("Este caixa ja esta fechado", 409);
  }

  const passwordSetting = await prisma.systemSetting.findUnique({
    where: {
      key: "finance.cash.close.password_hash"
    }
  });

  if (!passwordSetting) {
    throw new AppError("Senha de fechamento do caixa nao configurada", 422);
  }

  const validPassword = await comparePassword(input.password, passwordSetting.value);

  if (!validPassword) {
    throw new AppError("Senha de fechamento do caixa invalida", 401);
  }

  const summary = serializeCashBox(cashBox);
  const expectedAmount = summary.physicalBalance;
  const differenceAmount = input.countedAmount - expectedAmount;

  const updated = await prisma.cashBox.update({
    where: { id: cashBoxId },
    data: {
      status: CashBoxStatus.FECHADO,
      closingAmountExpected: expectedAmount,
      closingAmountCounted: input.countedAmount,
      differenceAmount,
      closingNotes: normalizeText(input.closingNotes),
      closedAt: new Date(),
      closedById: actorId
    }
  });

  await registerAuditLog({
    actorId,
    action: "CASH_BOX_CLOSED",
    entity: "CASH_BOX",
    entityId: updated.id,
    payload: {
      countedAmount: input.countedAmount,
      expectedAmount,
      differenceAmount
    }
  });

  return findCashBoxOrFail(updated.id).then(serializeCashBox);
}
