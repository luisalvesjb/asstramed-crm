import { Request, Response } from "express";
import {
  activityIdParamSchema,
  changeActivityStatusSchema,
  createActivityMessageSchema,
  createActivitySchema,
  listActivityInteractionsSchema,
  listActivitiesSchema
} from "./activities.validators";
import * as activitiesService from "./activities.service";

export async function listActivities(req: Request, res: Response): Promise<void> {
  const filters = listActivitiesSchema.parse(req.query);
  const activities = await activitiesService.listActivities(filters);
  res.status(200).json(activities);
}

export async function listActivityInteractions(req: Request, res: Response): Promise<void> {
  const filters = listActivityInteractionsSchema.parse(req.query);
  const interactions = await activitiesService.listActivityInteractions(filters);
  res.status(200).json(interactions);
}

export async function createActivity(req: Request, res: Response): Promise<void> {
  const payload = createActivitySchema.parse(req.body);
  const activity = await activitiesService.createActivity(req.user!.id, payload);
  res.status(201).json(activity);
}

export async function changeActivityStatus(req: Request, res: Response): Promise<void> {
  const { id } = activityIdParamSchema.parse(req.params);
  const { status } = changeActivityStatusSchema.parse(req.body);
  const activity = await activitiesService.changeActivityStatus(req.user!.id, id, status);
  res.status(200).json(activity);
}

export async function getActivityById(req: Request, res: Response): Promise<void> {
  const { id } = activityIdParamSchema.parse(req.params);
  const activity = await activitiesService.getActivityById(id);
  res.status(200).json(activity);
}

export async function addActivityMessage(req: Request, res: Response): Promise<void> {
  const { id } = activityIdParamSchema.parse(req.params);
  const payload = createActivityMessageSchema.parse(req.body);
  const message = await activitiesService.addActivityMessage(req.user!.id, id, payload.content);
  res.status(201).json(message);
}
