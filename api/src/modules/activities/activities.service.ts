import { ActivityStatus, MessagePriority, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { registerAuditLog } from "../../services/audit.service";
import { ListActivitiesFilters } from "./activities.interfaces";

function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getPeriodFilter(filters: ListActivitiesFilters): Prisma.DateTimeFilter | undefined {
  if (filters.startDate || filters.endDate) {
    return {
      gte: filters.startDate ? getDayBounds(filters.startDate).start : undefined,
      lte: filters.endDate ? getDayBounds(filters.endDate).end : undefined
    };
  }

  if (filters.date) {
    const day = getDayBounds(filters.date);
    return {
      gte: day.start,
      lte: day.end
    };
  }

  return undefined;
}

export async function listActivities(filters: ListActivitiesFilters) {
  const dateFilter = getPeriodFilter(filters);

  return prisma.activity.findMany({
    where: {
      status: filters.status,
      companyId: filters.companyId,
      assignedToId: filters.responsibleId,
      createdAt: dateFilter,
      tags: filters.tagKey
        ? {
            some: {
              tag: {
                key: filters.tagKey
              }
            }
        }
        : undefined
    },
    include: {
      company: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      }
    },
    orderBy: [{ orderExec: "asc" }, { createdAt: "asc" }]
  });
}

export async function listActivityInteractions(input: { companyId?: string; take?: number }) {
  const take = input.take ?? 5;

  return prisma.activity.findMany({
    where: {
      companyId: input.companyId,
      OR: [
        {
          description: {
            not: null
          }
        },
        {
          title: {
            not: ""
          }
        }
      ]
    },
    include: {
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
      company: {
        select: {
          id: true,
          code: true,
          name: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take
  });
}

async function resolveTags(tx: Prisma.TransactionClient, tagKeys: string[]) {
  if (!tagKeys.length) {
    return [] as { id: string }[];
  }

  const uniqueKeys = [...new Set(tagKeys.map((key) => key.trim().toUpperCase()).filter(Boolean))];

  const createdOrFound = await Promise.all(
    uniqueKeys.map(async (key) =>
      tx.tag.upsert({
        where: { key },
        update: {},
        create: {
          key,
          label: key,
          color: "#3C8DBC"
        },
        select: { id: true }
      })
    )
  );

  return createdOrFound;
}

export async function createActivity(
  actorId: string,
  input: {
    companyId: string;
    title: string;
    description?: string;
    priority: MessagePriority;
    assignedToId: string;
    dueDate?: Date;
    tagKeys: string[];
  }
) {
  const [company, responsible] = await Promise.all([
    prisma.company.findUnique({ where: { id: input.companyId } }),
    prisma.user.findUnique({ where: { id: input.assignedToId } })
  ]);

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }

  if (!responsible || !responsible.isActive) {
    throw new AppError("Responsavel invalido", 422);
  }

  const activity = await prisma.$transaction(async (tx) => {
    const lastActivity = await tx.activity.findFirst({
      where: {
        companyId: input.companyId
      },
      orderBy: { orderExec: "desc" },
      select: { orderExec: true }
    });

    const tags = await resolveTags(tx, input.tagKeys);

    const created = await tx.activity.create({
      data: {
        companyId: input.companyId,
        orderExec: (lastActivity?.orderExec ?? 0) + 1,
        title: input.title,
        description: input.description,
        priority: input.priority,
        assignedToId: input.assignedToId,
        createdById: actorId,
        dueDate: input.dueDate,
        status: ActivityStatus.PENDENTE,
        tags: {
          create: tags.map((tag) => ({
            tagId: tag.id
          }))
        }
      },
      include: {
        tags: {
          include: {
            tag: true
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
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await tx.activityStatusHistory.create({
      data: {
        activityId: created.id,
        fromStatus: null,
        toStatus: created.status,
        changedById: actorId
      }
    });

    return created;
  });

  await registerAuditLog({
    actorId,
    action: "ACTIVITY_CREATED",
    entity: "ACTIVITY",
    entityId: activity.id,
    payload: {
      companyId: input.companyId,
      assignedToId: input.assignedToId,
      priority: input.priority,
      status: activity.status
    }
  });

  return activity;
}

export async function changeActivityStatus(
  actorId: string,
  activityId: string,
  status: ActivityStatus
) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      assignedToId: true,
      createdById: true,
      status: true,
      completedAt: true
    }
  });

  if (!activity) {
    throw new AppError("Atividade nao encontrada", 404);
  }

  if (activity.status === status) {
    return activity;
  }

  const canManageStatus = activity.createdById === actorId || activity.assignedToId === actorId;
  if (!canManageStatus) {
    throw new AppError("Somente o criador ou o responsavel da atividade pode alterar o status.", 403);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.ActivityUpdateInput = {
      status,
      completedAt: status === ActivityStatus.CONCLUIDA ? new Date() : null,
      updatedAt: new Date()
    };

    const next = await tx.activity.update({
      where: { id: activityId },
      data,
      include: {
        tags: {
          include: {
            tag: true
          }
        },
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
        }
      }
    });

    await tx.activityStatusHistory.create({
      data: {
        activityId,
        fromStatus: activity.status,
        toStatus: status,
        changedById: actorId
      }
    });

    return next;
  });

  await registerAuditLog({
    actorId,
    action: "ACTIVITY_STATUS_CHANGED",
    entity: "ACTIVITY",
    entityId: activityId,
    payload: {
      from: activity.status,
      to: status,
      changedAt: updated.updatedAt
    }
  });

  return updated;
}

export async function getActivityById(activityId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      tags: {
        include: {
          tag: true
        }
      },
      company: true,
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
      messages: {
        where: {
          deletedAt: null
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      history: {
        include: {
          changedBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { changedAt: "desc" }
      }
    }
  });

  if (!activity) {
    throw new AppError("Atividade nao encontrada", 404);
  }

  return activity;
}

export async function addActivityMessage(actorId: string, activityId: string, content: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      companyId: true
    }
  });

  if (!activity) {
    throw new AppError("Atividade nao encontrada", 404);
  }

  const message = await prisma.activityMessage.create({
    data: {
      activityId,
      content: content.trim(),
      createdById: actorId
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  await registerAuditLog({
    actorId,
    action: "ACTIVITY_MESSAGE_CREATED",
    entity: "ACTIVITY_MESSAGE",
    entityId: message.id,
    payload: {
      activityId,
      companyId: activity.companyId
    }
  });

  return message;
}
