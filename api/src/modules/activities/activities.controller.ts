import { Request, Response } from "express";
import {
  changeActivityStatusSchema,
  createActivitySchema,
  listActivitiesSchema
} from "./activities.validators";
import * as activitiesService from "./activities.service";

export async function listActivities(req: Request, res: Response): Promise<void> {
  const filters = listActivitiesSchema.parse(req.query);
  const activities = await activitiesService.listActivities(filters);
  res.status(200).json(activities);
}

export async function createActivity(req: Request, res: Response): Promise<void> {
  const payload = createActivitySchema.parse(req.body);
  const activity = await activitiesService.createActivity(req.user!.id, payload);
  res.status(201).json(activity);
}

export async function changeActivityStatus(req: Request, res: Response): Promise<void> {
  const { status } = changeActivityStatusSchema.parse(req.body);
  const activity = await activitiesService.changeActivityStatus(req.user!.id, req.params.id, status);
  res.status(200).json(activity);
}

export async function getActivityById(req: Request, res: Response): Promise<void> {
  const activity = await activitiesService.getActivityById(req.params.id);
  res.status(200).json(activity);
}
