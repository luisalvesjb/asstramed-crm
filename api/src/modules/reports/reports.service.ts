import { ActivityStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { toCsv } from "../../utils/csv";

function buildDateFilter(startDate?: Date, endDate?: Date) {
  if (!startDate && !endDate) return undefined;

  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  return {
    gte: start,
    lte: end
  };
}

export async function activityReport(filters: {
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
  responsibleId?: string;
  status?: ActivityStatus;
  openOnly?: boolean;
}) {
  const statusFilter = filters.openOnly
    ? {
        in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
      }
    : filters.status;

  return prisma.activity.findMany({
    where: {
      createdAt: buildDateFilter(filters.startDate, filters.endDate),
      companyId: filters.companyId,
      assignedToId: filters.responsibleId,
      status: statusFilter
    },
    include: {
      company: {
        select: {
          id: true,
          name: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function productivityReport(filters: {
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
  openOnly?: boolean;
}) {
  const whereBase = {
    createdAt: buildDateFilter(filters.startDate, filters.endDate),
    companyId: filters.companyId,
    status: filters.openOnly
      ? {
          in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
        }
      : undefined
  };

  const [totals, resolved] = await Promise.all([
    prisma.activity.groupBy({
      by: ["assignedToId"],
      where: whereBase,
      _count: {
        _all: true
      }
    }),
    prisma.activity.groupBy({
      by: ["assignedToId"],
      where: {
        createdAt: buildDateFilter(filters.startDate, filters.endDate),
        companyId: filters.companyId,
        status: ActivityStatus.CONCLUIDA
      },
      _count: {
        _all: true
      }
    })
  ]);

  const userIds = totals.map((item) => item.assignedToId);
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds
      }
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  const resolvedMap = new Map(resolved.map((item) => [item.assignedToId, item._count._all]));
  const userMap = new Map(users.map((user) => [user.id, user]));

  return totals.map((item) => {
    const user = userMap.get(item.assignedToId);
    const resolvedCount = filters.openOnly ? 0 : resolvedMap.get(item.assignedToId) ?? 0;
    const total = item._count._all;

    return {
      userId: item.assignedToId,
      userName: user?.name ?? "Usuario removido",
      email: user?.email ?? null,
      totalActivities: total,
      resolvedActivities: resolvedCount,
      unresolvedActivities: total - resolvedCount
    };
  });
}

export async function pendingByCompanyReport(filters: { startDate?: Date; endDate?: Date; companyId?: string }) {
  const pending = await prisma.activity.groupBy({
    by: ["companyId"],
    where: {
      createdAt: buildDateFilter(filters.startDate, filters.endDate),
      companyId: filters.companyId,
      status: {
        in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
      }
    },
    _count: {
      _all: true
    }
  });

  const companyIds = pending.map((item) => item.companyId);
  const companies = await prisma.company.findMany({
    where: {
      id: {
        in: companyIds
      }
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true
    }
  });

  const map = new Map(companies.map((company) => [company.id, company]));

  return pending
    .map((item) => ({
      companyId: item.companyId,
      companyName: map.get(item.companyId)?.name ?? "Empresa removida",
      city: map.get(item.companyId)?.city ?? null,
      state: map.get(item.companyId)?.state ?? null,
      pendingCount: item._count._all
    }))
    .sort((a, b) => b.pendingCount - a.pendingCount);
}

export async function contractsByDueReport() {
  const contracts = await prisma.contract.findMany({
    where: {
      dueDay: {
        not: null
      }
    },
    include: {
      company: {
        select: {
          id: true,
          name: true
        }
      },
      documents: {
        select: {
          documentId: true
        }
      }
    },
    orderBy: [{ dueDay: "asc" }, { createdAt: "desc" }]
  });

  return contracts.map((contract) => ({
    contractId: contract.id,
    companyId: contract.companyId,
    companyName: contract.company.name,
    dueDay: contract.dueDay,
    billingCycle: contract.billingCycle,
    value: contract.value,
    documentCount: contract.documents.length,
    createdAt: contract.createdAt
  }));
}

export async function activitiesCsv(filters: {
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
  responsibleId?: string;
  status?: ActivityStatus;
  openOnly?: boolean;
}) {
  const rows = await activityReport(filters);

  return toCsv(
    rows.map((activity) => ({
      id: activity.id,
      company: activity.company.name,
      orderExec: activity.orderExec,
      title: activity.title,
      status: activity.status,
      responsible: activity.assignedTo.name,
      createdBy: activity.createdBy.name,
      tags: activity.tags.map((item) => item.tag.key).join("|") || "",
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
      completedAt: activity.completedAt?.toISOString() ?? ""
    }))
  );
}
