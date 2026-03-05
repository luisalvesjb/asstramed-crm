import { Router } from "express";
import * as auditLogController from "./audit-log.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";

export const auditLogRoutes = Router();

auditLogRoutes.use(authMiddleware);
auditLogRoutes.use(permissionMiddleware([PERMISSIONS.PERMISSIONS_MANAGE]));

auditLogRoutes.get("/", auditLogController.listAuditLogs);
