import { Request, Response } from "express";
import {
  financialDailyReportSchema,
  financialOutflowByDaySchema
} from "./financial-reports.validators";
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
