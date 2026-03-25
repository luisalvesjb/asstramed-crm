import { FinancialEntryStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ensureRecurringEntriesGenerated } from "../financial-entries/financial-entries.service";

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

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function resolvePaidAmount(entry: { amount: Prisma.Decimal | number; amountPaid?: Prisma.Decimal | number | null }): number {
  return Number(entry.amountPaid ?? entry.amount);
}

export async function dailyReport(date?: Date) {
  const target = date ?? new Date();
  const start = startOfDay(target);
  const end = endOfDay(target);

  await ensureRecurringEntriesGenerated(end);

  const [dueToday, paidToday, overdue, pending] = await Promise.all([
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        dueDate: {
          gte: start,
          lte: end
        },
        status: {
          in: [FinancialEntryStatus.PENDENTE, FinancialEntryStatus.VENCIDO, FinancialEntryStatus.PAGO]
        }
      },
      include: {
        category: true,
        costCenter: true,
        paymentMethod: true
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
    }),
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: FinancialEntryStatus.PAGO,
        paymentDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        category: true,
        costCenter: true,
        paymentMethod: true
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [FinancialEntryStatus.PENDENTE, FinancialEntryStatus.VENCIDO]
        },
        dueDate: {
          lt: start
        }
      },
      include: {
        category: true,
        costCenter: true,
        paymentMethod: true
      },
      orderBy: { dueDate: "asc" }
    }),
    prisma.financialEntry.findMany({
      where: {
        deletedAt: null,
        status: FinancialEntryStatus.PENDENTE
      },
      include: {
        category: true,
        costCenter: true,
        paymentMethod: true
      },
      orderBy: { dueDate: "asc" }
    })
  ]);

  const paidOut = paidToday.reduce((acc, entry) => acc + resolvePaidAmount(entry), 0);
  const dueTodayAmount = dueToday.reduce((acc, entry) => acc + Number(entry.amount), 0);
  const overdueAmount = overdue.reduce((acc, entry) => acc + Number(entry.amount), 0);
  const pendingAmount = pending.reduce((acc, entry) => acc + Number(entry.amount), 0);

  return {
    date: dateKey(target),
    kpis: {
      paidOut,
      dueToday: dueTodayAmount,
      overdue: overdueAmount,
      pending: pendingAmount,
      paidCount: paidToday.length,
      dueCount: dueToday.length,
      overdueCount: overdue.length,
      pendingCount: pending.length
    },
    paidToday,
    dueToday,
    overdue
  };
}

export async function outflowByDay(filters: {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  costCenterId?: string;
  paymentMethodId?: string;
}) {
  const from = filters.startDate ? startOfDay(filters.startDate) : startOfDay(new Date(Date.now() - 1000 * 60 * 60 * 24 * 29));
  const to = filters.endDate ? endOfDay(filters.endDate) : endOfDay(new Date());

  await ensureRecurringEntriesGenerated(to);

  const entries = await prisma.financialEntry.findMany({
    where: {
      deletedAt: null,
      status: FinancialEntryStatus.PAGO,
      paymentDate: {
        gte: from,
        lte: to
      },
      categoryId: filters.categoryId,
      costCenterId: filters.costCenterId,
      paymentMethodId: filters.paymentMethodId
    },
    include: {
      category: true,
      costCenter: true,
      paymentMethod: true
    },
    orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }]
  });

  const map = new Map<string, { date: string; total: number; count: number }>();

  for (const entry of entries) {
    if (!entry.paymentDate) {
      continue;
    }

    const key = dateKey(entry.paymentDate);
    const current = map.get(key) ?? { date: key, total: 0, count: 0 };
    current.total += resolvePaidAmount(entry);
    current.count += 1;
    map.set(key, current);
  }

  return {
    period: {
      startDate: dateKey(from),
      endDate: dateKey(to)
    },
    totalOutflow: entries.reduce((acc, entry) => acc + resolvePaidAmount(entry), 0),
    totalCount: entries.length,
    grouped: [...map.values()].sort((a, b) => a.date.localeCompare(b.date)),
    entries
  };
}
