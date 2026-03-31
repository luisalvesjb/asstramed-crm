import { Router } from "express";
import * as auditLogController from "./audit-log.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { asyncHandler } from "../../utils/async-handler";

export const auditLogRoutes = Router();

auditLogRoutes.use(authMiddleware);
auditLogRoutes.use(permissionMiddleware([PERMISSIONS.PERMISSIONS_MANAGE]));

auditLogRoutes.get("/", asyncHandler(auditLogController.listAuditLogs));
