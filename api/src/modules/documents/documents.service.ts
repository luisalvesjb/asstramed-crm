import { prisma } from "../../db/prisma";
import { AppError } from "../../errors/app-error";
import { registerAuditLog } from "../../services/audit.service";

export async function createDocument(
  actorId: string,
  input: {
    companyId: string;
    title: string;
    description?: string;
    file: Express.Multer.File;
  }
) {
  const company = await prisma.company.findUnique({ where: { id: input.companyId } });

  if (!company) {
    throw new AppError("Empresa nao encontrada", 404);
  }

  const normalizedPath = `assets/documents/${input.companyId}/${input.file.filename}`;

  const document = await prisma.document.create({
    data: {
      companyId: input.companyId,
      name: input.file.originalname,
      title: input.title,
      description: input.description,
      filePath: normalizedPath,
      fileSize: input.file.size,
      mimeType: input.file.mimetype,
      uploadedById: actorId
    }
  });

  await registerAuditLog({
    actorId,
    action: "DOCUMENT_UPLOADED",
    entity: "DOCUMENT",
    entityId: document.id,
    payload: {
      companyId: input.companyId,
      filePath: normalizedPath
    }
  });

  return document;
}

export async function listDocuments(companyId: string) {
  return prisma.document.findMany({
    where: {
      companyId,
      deletedAt: null
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function archiveDocument(actorId: string, documentId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });

  if (!document || document.deletedAt) {
    throw new AppError("Documento nao encontrado", 404);
  }

  const archived = await prisma.document.update({
    where: { id: documentId },
    data: {
      deletedAt: new Date()
    }
  });

  await registerAuditLog({
    actorId,
    action: "DOCUMENT_ARCHIVED",
    entity: "DOCUMENT",
    entityId: documentId
  });

  return archived;
}
