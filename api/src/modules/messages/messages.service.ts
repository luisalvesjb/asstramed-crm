import { MessagePriority } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { registerAuditLog } from "../../services/audit.service";

interface ListMessagesFilters {
  companyId?: string;
  includeResolved?: boolean;
  search?: string;
}

async function ensureCompanyExists(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true }
  });

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }
}

async function ensureUserExists(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true }
  });

  if (!user || !user.isActive) {
    throw new AppError("Responsavel informado nao encontrado", 422);
  }
}

export async function listMessages(filters: ListMessagesFilters) {
  return prisma.companyMessage.findMany({
    where: {
      companyId: filters.companyId,
      parentMessageId: null,
      deletedAt: null,
      resolvedAt: filters.includeResolved ? undefined : null,
      OR: filters.search
        ? [
            {
              content: {
                contains: filters.search,
                mode: "insensitive"
              }
            },
            {
              createdBy: {
                name: {
                  contains: filters.search,
                  mode: "insensitive"
                }
              }
            },
            {
              company: {
                name: {
                  contains: filters.search,
                  mode: "insensitive"
                }
              }
            }
          ]
        : undefined
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
      resolvedBy: {
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
    orderBy: [{ resolvedAt: "asc" }, { priority: "asc" }, { createdAt: "desc" }]
  });
}

export async function getThread(messageId: string) {
  const current = await prisma.companyMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      parentMessageId: true
    }
  });

  if (!current) {
    throw new AppError("Mensagem nao encontrada", 404);
  }

  const rootId = current.parentMessageId ?? current.id;

  const root = await prisma.companyMessage.findFirst({
    where: {
      id: rootId,
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
      resolvedBy: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!root) {
    throw new AppError("Mensagem nao encontrada", 404);
  }

  const replies = await prisma.companyMessage.findMany({
    where: {
      parentMessageId: root.id,
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
    orderBy: [{ createdAt: "asc" }]
  });

  return {
    root,
    replies
  };
}

export async function createMessage(
  actorId: string,
  input: {
    companyId: string;
    content: string;
    priority: MessagePriority;
    directedToId?: string;
  }
) {
  await ensureCompanyExists(input.companyId);

  if (input.directedToId) {
    await ensureUserExists(input.directedToId);
  }

  const message = await prisma.companyMessage.create({
    data: {
      companyId: input.companyId,
      content: input.content.trim(),
      priority: input.priority,
      directedToId: input.directedToId,
      createdById: actorId
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
      }
    }
  });

  await registerAuditLog({
    actorId,
    action: "COMPANY_MESSAGE_CREATED",
    entity: "COMPANY_MESSAGE",
    entityId: message.id,
    payload: {
      companyId: input.companyId,
      priority: input.priority,
      directedToId: input.directedToId ?? null
    }
  });

  return message;
}

export async function replyMessage(actorId: string, messageId: string, content: string) {
  const parent = await prisma.companyMessage.findFirst({
    where: {
      id: messageId,
      deletedAt: null
    }
  });

  if (!parent) {
    throw new AppError("Mensagem nao encontrada", 404);
  }

  const rootId = parent.parentMessageId ?? parent.id;
  const root = rootId === parent.id ? parent : await prisma.companyMessage.findUnique({ where: { id: rootId } });

  if (!root || root.deletedAt) {
    throw new AppError("Mensagem nao encontrada", 404);
  }

  if (root.resolvedAt) {
    throw new AppError("Mensagem ja resolvida", 422);
  }

  const reply = await prisma.companyMessage.create({
    data: {
      companyId: root.companyId,
      parentMessageId: root.id,
      content: content.trim(),
      priority: root.priority,
      directedToId: root.directedToId,
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
    action: "COMPANY_MESSAGE_REPLIED",
    entity: "COMPANY_MESSAGE",
    entityId: root.id,
    payload: {
      replyId: reply.id
    }
  });

  return reply;
}

export async function resolveMessage(actorId: string, messageId: string) {
  const current = await prisma.companyMessage.findFirst({
    where: {
      id: messageId,
      deletedAt: null
    }
  });

  if (!current) {
    throw new AppError("Mensagem nao encontrada", 404);
  }

  const rootId = current.parentMessageId ?? current.id;

  const root = await prisma.companyMessage.findFirst({
    where: {
      id: rootId,
      deletedAt: null
    }
  });

  if (!root) {
    throw new AppError("Mensagem nao encontrada", 404);
  }

  if (root.resolvedAt) {
    return root;
  }

  const updated = await prisma.companyMessage.update({
    where: { id: root.id },
    data: {
      resolvedAt: new Date(),
      resolvedById: actorId
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
      resolvedBy: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  await registerAuditLog({
    actorId,
    action: "COMPANY_MESSAGE_RESOLVED",
    entity: "COMPANY_MESSAGE",
    entityId: root.id
  });

  return updated;
}
