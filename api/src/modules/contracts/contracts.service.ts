import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { registerAuditLog } from "../../services/audit.service";

export async function listContracts(companyId?: string) {
  return prisma.contract.findMany({
    where: {
      companyId
    },
    include: {
      company: {
        select: {
          id: true,
          name: true
        }
      },
      documents: {
        include: {
          document: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function createContract(
  actorId: string,
  input: {
    companyId: string;
    value?: number;
    billingCycle?: string;
    dueDay?: number;
    notes?: string;
    documentIds: string[];
  }
) {
  const company = await prisma.company.findUnique({ where: { id: input.companyId } });

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }

  const documents = await prisma.document.findMany({
    where: {
      id: { in: input.documentIds },
      companyId: input.companyId,
      deletedAt: null
    }
  });

  if (documents.length !== input.documentIds.length) {
    throw new AppError("Documento(s) invalido(s) para o contrato", 422);
  }

  const contract = await prisma.contract.create({
    data: {
      companyId: input.companyId,
      value: input.value,
      billingCycle: input.billingCycle,
      dueDay: input.dueDay,
      notes: input.notes,
      documents: {
        create: input.documentIds.map((documentId) => ({
          documentId
        }))
      }
    },
    include: {
      documents: {
        include: {
          document: true
        }
      }
    }
  });

  await registerAuditLog({
    actorId,
    action: "CONTRACT_CREATED",
    entity: "CONTRACT",
    entityId: contract.id,
    payload: {
      companyId: input.companyId,
      documentCount: input.documentIds.length
    }
  });

  return contract;
}
