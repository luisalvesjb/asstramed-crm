import { ActivityStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";

function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function getDashboardActivities(input: {
  date?: Date;
  status?: ActivityStatus;
  companyId?: string;
  responsibleId?: string;
  tagKey?: string;
  includeMessages?: boolean;
}) {
  const date = input.date ?? new Date();
  const { start, end } = dayBounds(date);
  const statusFilter = input.status ?? ActivityStatus.PENDENTE;

  const whereBase = {
    companyId: input.companyId,
    assignedToId: input.responsibleId,
    createdAt: {
      gte: start,
      lte: end
    },
    tags: input.tagKey
      ? {
          some: {
            tag: {
              key: input.tagKey
            }
          }
        }
      : undefined
  };

  const [activities, resolvedCount, unresolvedCount, totalOpenedCount] = await Promise.all([
    prisma.activity.findMany({
      where: {
        ...whereBase,
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
      orderBy: [{ orderExec: "asc" }, { createdAt: "asc" }]
    }),
    prisma.activity.count({
      where: {
        ...whereBase,
        status: ActivityStatus.CONCLUIDA
      }
    }),
    prisma.activity.count({
      where: {
        ...whereBase,
        status: {
          not: ActivityStatus.CONCLUIDA
        }
      }
    }),
    prisma.activity.count({
      where: {
        ...whereBase,
        status: {
          in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
        }
      }
    })
  ]);

  const [openMessagesByPriorityRaw, highlightedMessages] = input.includeMessages === false
    ? [[], []]
    : await Promise.all([
        prisma.companyMessage.groupBy({
          by: ["priority"],
          where: {
            companyId: input.companyId,
            parentMessageId: null,
            deletedAt: null,
            resolvedAt: null
          },
          _count: {
            _all: true
          }
        }),
        prisma.companyMessage.findMany({
          where: {
            companyId: input.companyId,
            parentMessageId: null,
            deletedAt: null
          },
          include: {
            company: {
              select: {
                id: true,
                code: true,
                name: true
              }
            },
            createdBy: {
              select: {
                id: true,
                name: true
              }
            },
            directedTo: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                replies: {
                  where: {
                    deletedAt: null
                  }
                }
              }
            }
          },
          orderBy: [{ resolvedAt: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
          take: 5
        })
      ]);

  const openMessagesByPriority = {
    alta: 0,
    media: 0,
    baixa: 0,
    total: 0
  };

  for (const row of openMessagesByPriorityRaw) {
    if (row.priority === "ALTA") {
      openMessagesByPriority.alta = row._count._all;
      openMessagesByPriority.total += row._count._all;
      continue;
    }

    if (row.priority === "MEDIA") {
      openMessagesByPriority.media = row._count._all;
      openMessagesByPriority.total += row._count._all;
      continue;
    }

    openMessagesByPriority.baixa = row._count._all;
    openMessagesByPriority.total += row._count._all;
  }

  return {
    filters: {
      date,
      status: statusFilter,
      companyId: input.companyId ?? null,
      responsibleId: input.responsibleId ?? null,
      tagKey: input.tagKey ?? null
    },
    kpis: {
      resolved: resolvedCount,
      unresolved: unresolvedCount,
      totalOpen: totalOpenedCount
    },
    activities,
    messages: {
      openByPriority: openMessagesByPriority,
      highlighted: highlightedMessages
    }
  };
}
