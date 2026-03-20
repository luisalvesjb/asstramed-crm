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

  const [openActivitiesByPriorityRaw, highlightedActivities] = await Promise.all([
    prisma.activity.groupBy({
      by: ["priority"],
      where: {
        companyId: input.companyId,
        status: {
          in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
        }
      },
      _count: {
        _all: true
      }
    }),
    prisma.activity.findMany({
      where: {
        companyId: input.companyId,
        status: {
          in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
        }
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
        assignedTo: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            messages: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 5
    })
  ]);

  const [hasOpenHighPriority, recentMessages] = await Promise.all([
    prisma.activity.count({
      where: {
        companyId: input.companyId,
        priority: "ALTA",
        status: {
          in: [ActivityStatus.PENDENTE, ActivityStatus.EM_EXECUCAO]
        }
      }
    }),
    prisma.activityMessage.findMany({
      where: {
        deletedAt: null,
        activity: input.companyId
          ? {
              companyId: input.companyId
            }
          : undefined
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        activity: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assignedTo: {
              select: {
                id: true,
                name: true
              }
            },
            company: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    })
  ]);

  const openMessagesByPriority = {
    alta: 0,
    media: 0,
    baixa: 0,
    total: 0
  };

  for (const row of openActivitiesByPriorityRaw) {
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
    activityInsights: {
      openByPriority: openMessagesByPriority,
      highlighted: highlightedActivities,
      hasOpenHighPriority: hasOpenHighPriority > 0,
      recentMessages
    }
  };
}
