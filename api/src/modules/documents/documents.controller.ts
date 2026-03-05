import { Request, Response } from "express";
import { createDocumentSchema, listDocumentsSchema } from "./documents.validators";
import * as documentsService from "./documents.service";
import { AppError } from "../../errors/app-error";

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const payload = createDocumentSchema.parse(req.body);

  if (!req.file) {
    throw new AppError("Arquivo e obrigatorio", 422);
  }

  const document = await documentsService.createDocument(req.user!.id, {
    companyId: payload.companyId,
    title: payload.title,
    description: payload.description,
    file: req.file
  });

  res.status(201).json(document);
}

export async function listDocuments(req: Request, res: Response): Promise<void> {
  const { companyId } = listDocumentsSchema.parse(req.query);
  const documents = await documentsService.listDocuments(companyId);
  res.status(200).json(documents);
}

export async function archiveDocument(req: Request, res: Response): Promise<void> {
  const document = await documentsService.archiveDocument(req.user!.id, req.params.id);
  res.status(200).json(document);
}
