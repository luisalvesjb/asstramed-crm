import { Request, Response } from "express";
import { dashboardActivitiesSchema } from "./dashboard.validators";
import * as dashboardService from "./dashboard.service";

export async function getDashboardActivities(req: Request, res: Response): Promise<void> {
  const payload = dashboardActivitiesSchema.parse(req.query);

  const result = await dashboardService.getDashboardActivities(payload);
  res.status(200).json(result);
}
