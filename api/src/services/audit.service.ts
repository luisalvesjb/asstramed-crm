import { prisma } from "../db/prisma";

interface RegisterAuditLogInput {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  payload?: unknown;
}

export async function registerAuditLog(input: RegisterAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      payload: input.payload as object | undefined
    }
  });
}
