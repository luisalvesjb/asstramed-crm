import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as financialEntriesController from "./financial-entries.controller";
import { financialEntryFilesUpload } from "../../gateways/financial-entry-files.gateway";

export const financialEntriesRoutes = Router();

financialEntriesRoutes.use(authMiddleware);

financialEntriesRoutes.get(
  "/",
  permissionMiddleware([PERMISSIONS.FINANCE_READ]),
  financialEntriesController.listFinancialEntries
);
financialEntriesRoutes.post(
  "/",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  financialEntriesController.createFinancialEntry
);
financialEntriesRoutes.patch(
  "/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  financialEntriesController.updateFinancialEntry
);
financialEntriesRoutes.patch(
  "/:id/pay",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  financialEntriesController.payFinancialEntry
);
financialEntriesRoutes.delete(
  "/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  financialEntriesController.deleteFinancialEntry
);
financialEntriesRoutes.post(
  "/:id/bank-slip",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  financialEntryFilesUpload.single("file"),
  financialEntriesController.uploadFinancialEntryBankSlip
);
financialEntriesRoutes.post(
  "/:id/payment-receipt",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  financialEntryFilesUpload.single("file"),
  financialEntriesController.uploadFinancialEntryPaymentReceipt
);
