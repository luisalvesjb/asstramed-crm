import { Request, Response } from "express";
import { reportFiltersSchema } from "./reports.validators";
import * as reportsService from "./reports.service";

export async function activities(req: Request, res: Response): Promise<void> {
  const filters = reportFiltersSchema.parse(req.query);
  const result = await reportsService.activityReport(filters);
  res.status(200).json(result);
}

export async function productivity(req: Request, res: Response): Promise<void> {
  const filters = reportFiltersSchema.parse(req.query);
  const result = await reportsService.productivityReport(filters);
  res.status(200).json(result);
}

export async function pendingByCompany(req: Request, res: Response): Promise<void> {
  const filters = reportFiltersSchema.parse(req.query);
  const result = await reportsService.pendingByCompanyReport(filters);
  res.status(200).json(result);
}

export async function contractsByDue(_req: Request, res: Response): Promise<void> {
  const result = await reportsService.contractsByDueReport();
  res.status(200).json(result);
}

export async function activitiesCsv(req: Request, res: Response): Promise<void> {
  const filters = reportFiltersSchema.parse(req.query);
  const csv = await reportsService.activitiesCsv(filters);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=relatorio-atividades.csv");
  res.status(200).send(csv);
}
