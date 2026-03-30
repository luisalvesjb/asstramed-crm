import { Request, Response } from "express";
import {
  cashBoxIdParamSchema,
  cashOverviewQuerySchema,
  closeCashBoxSchema,
  createCashMovementSchema,
  openCashBoxSchema
} from "./financial-cash.validators";
import * as financialCashService from "./financial-cash.service";

export async function getCashOverview(req: Request, res: Response): Promise<void> {
  const filters = cashOverviewQuerySchema.parse(req.query);
  const overview = await financialCashService.getCashOverview(filters);
  res.status(200).json(overview);
}

export async function openCashBox(req: Request, res: Response): Promise<void> {
  const payload = openCashBoxSchema.parse(req.body);
  const cashBox = await financialCashService.openCashBox(req.user!.id, payload);
  res.status(201).json(cashBox);
}

export async function addCashMovement(req: Request, res: Response): Promise<void> {
  const { id } = cashBoxIdParamSchema.parse(req.params);
  const payload = createCashMovementSchema.parse(req.body);
  const cashBox = await financialCashService.addCashMovement(req.user!.id, id, payload);
  res.status(201).json(cashBox);
}

export async function closeCashBox(req: Request, res: Response): Promise<void> {
  const { id } = cashBoxIdParamSchema.parse(req.params);
  const payload = closeCashBoxSchema.parse(req.body);
  const cashBox = await financialCashService.closeCashBox(req.user!.id, id, payload);
  res.status(200).json(cashBox);
}
