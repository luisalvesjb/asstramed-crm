import { prisma } from "../../db/prisma";

export async function listAuditLogs(filters: {
  action?: string;
  entity?: string;
  actorId?: string;
  limit: number;
}) {
  return prisma.auditLog.findMany({
    where: {
      action: filters.action,
      entity: filters.entity,
      actorId: filters.actorId
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: filters.limit
  });
}
