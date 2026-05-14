import { Request, Response } from "express";
import {
  financialDailyReportSchema,
  financialOutflowByDaySchema
} from "./financial-reports.validators";
import { listFinancialEntriesSchema } from "../financial-entries/financial-entries.validators";
import * as financialReportsService from "./financial-reports.service";

export async function dailyReport(req: Request, res: Response): Promise<void> {
  const { date } = financialDailyReportSchema.parse(req.query);
  const report = await financialReportsService.dailyReport(date);
  res.status(200).json(report);
}

export async function outflowByDay(req: Request, res: Response): Promise<void> {
  const filters = financialOutflowByDaySchema.parse(req.query);
  const report = await financialReportsService.outflowByDay(filters);
  res.status(200).json(report);
}

export async function entriesPdf(req: Request, res: Response): Promise<void> {
  const filters = listFinancialEntriesSchema.parse(req.query);
  const pdf = await financialReportsService.entriesPdf(filters);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=relatorio-financeiro.pdf");
  res.status(200).send(pdf);
}
