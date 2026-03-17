import { Request, Response } from "express";
import {
  createFinancialSettingSchema,
  financialSettingIdParamSchema,
  listFinancialSettingsSchema,
  updateFinancialSettingSchema
} from "./financial-settings.validators";
import * as financialSettingsService from "./financial-settings.service";

export async function listCategories(req: Request, res: Response): Promise<void> {
  const filters = listFinancialSettingsSchema.parse(req.query);
  const categories = await financialSettingsService.listCategories(filters);
  res.status(200).json(categories);
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const payload = createFinancialSettingSchema.parse(req.body);
  const category = await financialSettingsService.createCategory(req.user!.id, payload);
  res.status(201).json(category);
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { id } = financialSettingIdParamSchema.parse(req.params);
  const payload = updateFinancialSettingSchema.parse(req.body);
  const category = await financialSettingsService.updateCategory(req.user!.id, id, payload);
  res.status(200).json(category);
}

export async function listCostCenters(req: Request, res: Response): Promise<void> {
  const filters = listFinancialSettingsSchema.parse(req.query);
  const items = await financialSettingsService.listCostCenters(filters);
  res.status(200).json(items);
}

export async function createCostCenter(req: Request, res: Response): Promise<void> {
  const payload = createFinancialSettingSchema.parse(req.body);
  const item = await financialSettingsService.createCostCenter(req.user!.id, payload);
  res.status(201).json(item);
}

export async function updateCostCenter(req: Request, res: Response): Promise<void> {
  const { id } = financialSettingIdParamSchema.parse(req.params);
  const payload = updateFinancialSettingSchema.parse(req.body);
  const item = await financialSettingsService.updateCostCenter(req.user!.id, id, payload);
  res.status(200).json(item);
}

export async function listPaymentMethods(req: Request, res: Response): Promise<void> {
  const filters = listFinancialSettingsSchema.parse(req.query);
  const items = await financialSettingsService.listPaymentMethods(filters);
  res.status(200).json(items);
}

export async function createPaymentMethod(req: Request, res: Response): Promise<void> {
  const payload = createFinancialSettingSchema.parse(req.body);
  const item = await financialSettingsService.createPaymentMethod(req.user!.id, payload);
  res.status(201).json(item);
}

export async function updatePaymentMethod(req: Request, res: Response): Promise<void> {
  const { id } = financialSettingIdParamSchema.parse(req.params);
  const payload = updateFinancialSettingSchema.parse(req.body);
  const item = await financialSettingsService.updatePaymentMethod(req.user!.id, id, payload);
  res.status(200).json(item);
}

export async function deactivateCategory(req: Request, res: Response): Promise<void> {
  const { id } = financialSettingIdParamSchema.parse(req.params);
  const item = await financialSettingsService.deactivateCategory(req.user!.id, id);
  res.status(200).json(item);
}

export async function deactivateCostCenter(req: Request, res: Response): Promise<void> {
  const { id } = financialSettingIdParamSchema.parse(req.params);
  const item = await financialSettingsService.deactivateCostCenter(req.user!.id, id);
  res.status(200).json(item);
}

export async function deactivatePaymentMethod(req: Request, res: Response): Promise<void> {
  const { id } = financialSettingIdParamSchema.parse(req.params);
  const item = await financialSettingsService.deactivatePaymentMethod(req.user!.id, id);
  res.status(200).json(item);
}
