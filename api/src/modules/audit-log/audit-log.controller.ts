import { Request, Response } from "express";
import { listAuditLogsSchema } from "./audit-log.validators";
import * as auditLogService from "./audit-log.service";

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const filters = listAuditLogsSchema.parse(req.query);
  const result = await auditLogService.listAuditLogs(filters);
  res.status(200).json(result);
}
