import { Router } from "express";
import * as documentsController from "./documents.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { upload } from "../../gateways/upload.gateway";
import { asyncHandler } from "../../utils/async-handler";

export const documentsRoutes = Router();

documentsRoutes.use(authMiddleware);

documentsRoutes.get("/", permissionMiddleware([PERMISSIONS.DOCUMENTS_READ]), asyncHandler(documentsController.listDocuments));
documentsRoutes.post(
  "/upload",
  permissionMiddleware([PERMISSIONS.DOCUMENTS_WRITE]),
  upload.single("file"),
  asyncHandler(documentsController.uploadDocument)
);
documentsRoutes.patch(
  "/:id/archive",
  permissionMiddleware([PERMISSIONS.DOCUMENTS_WRITE]),
  asyncHandler(documentsController.archiveDocument)
);
