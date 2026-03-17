import { Request, Response } from "express";
import { dashboardActivitiesSchema } from "./dashboard.validators";
import * as dashboardService from "./dashboard.service";
import { PERMISSIONS } from "../../config/permissions";

export async function getDashboardActivities(req: Request, res: Response): Promise<void> {
  const payload = dashboardActivitiesSchema.parse(req.query);
  const canReadMessages =
    req.user?.isAdmin === true || Boolean(req.user?.permissions.includes(PERMISSIONS.MESSAGES_READ));

  const result = await dashboardService.getDashboardActivities({
    ...payload,
    includeMessages: canReadMessages
  });
  res.status(200).json(result);
}
