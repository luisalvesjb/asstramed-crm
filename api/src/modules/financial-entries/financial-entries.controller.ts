import { Request, Response } from "express";
import {
  createFinancialEntrySchema,
  financialEntryIdParamSchema,
  listFinancialEntriesSchema,
  payFinancialEntrySchema,
  updateFinancialEntrySchema
} from "./financial-entries.validators";
import * as financialEntriesService from "./financial-entries.service";
import { AppError } from "../../errors/app-error";

export async function listFinancialEntries(req: Request, res: Response): Promise<void> {
  const filters = listFinancialEntriesSchema.parse(req.query);
  const entries = await financialEntriesService.listFinancialEntries(filters);
  res.status(200).json(entries);
}

export async function createFinancialEntry(req: Request, res: Response): Promise<void> {
  const payload = createFinancialEntrySchema.parse(req.body);
  const entry = await financialEntriesService.createFinancialEntry(req.user!.id, payload);
  res.status(201).json(entry);
}

export async function updateFinancialEntry(req: Request, res: Response): Promise<void> {
  const { id } = financialEntryIdParamSchema.parse(req.params);
  const payload = updateFinancialEntrySchema.parse(req.body);
  const entry = await financialEntriesService.updateFinancialEntry(req.user!.id, id, payload);
  res.status(200).json(entry);
}

export async function payFinancialEntry(req: Request, res: Response): Promise<void> {
  const { id } = financialEntryIdParamSchema.parse(req.params);
  const payload = payFinancialEntrySchema.parse(req.body);
  const entry = await financialEntriesService.markFinancialEntryAsPaid(req.user!.id, id, payload);
  res.status(200).json(entry);
}

export async function deleteFinancialEntry(req: Request, res: Response): Promise<void> {
  const { id } = financialEntryIdParamSchema.parse(req.params);
  const result = await financialEntriesService.deleteFinancialEntry(req.user!.id, id);
  res.status(200).json(result);
}

export async function uploadFinancialEntryBankSlip(req: Request, res: Response): Promise<void> {
  const { id } = financialEntryIdParamSchema.parse(req.params);

  if (!req.file) {
    throw new AppError("Arquivo do boleto e obrigatorio", 422);
  }

  const entry = await financialEntriesService.attachFinancialEntryBankSlip(req.user!.id, id, req.file);
  res.status(200).json(entry);
}

export async function uploadFinancialEntryPaymentReceipt(req: Request, res: Response): Promise<void> {
  const { id } = financialEntryIdParamSchema.parse(req.params);

  if (!req.file) {
    throw new AppError("Arquivo do comprovante e obrigatorio", 422);
  }

  const entry = await financialEntriesService.attachFinancialEntryPaymentReceipt(
    req.user!.id,
    id,
    req.file
  );
  res.status(200).json(entry);
}
