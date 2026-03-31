import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as financialEntriesController from "./financial-entries.controller";
import { financialEntryFilesUpload } from "../../gateways/financial-entry-files.gateway";
import { asyncHandler } from "../../utils/async-handler";

export const financialEntriesRoutes = Router();

financialEntriesRoutes.use(authMiddleware);

financialEntriesRoutes.get(
  "/",
  permissionMiddleware([PERMISSIONS.FINANCE_READ]),
  asyncHandler(financialEntriesController.listFinancialEntries)
);
financialEntriesRoutes.post(
  "/",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  asyncHandler(financialEntriesController.createFinancialEntry)
);
financialEntriesRoutes.patch(
  "/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  asyncHandler(financialEntriesController.updateFinancialEntry)
);
financialEntriesRoutes.patch(
  "/:id/pay",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  asyncHandler(financialEntriesController.payFinancialEntry)
);
financialEntriesRoutes.delete(
  "/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  asyncHandler(financialEntriesController.deleteFinancialEntry)
);
financialEntriesRoutes.post(
  "/:id/bank-slip",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  financialEntryFilesUpload.single("file"),
  asyncHandler(financialEntriesController.uploadFinancialEntryBankSlip)
);
financialEntriesRoutes.post(
  "/:id/payment-receipt",
  permissionMiddleware([PERMISSIONS.FINANCE_WRITE]),
  financialEntryFilesUpload.single("file"),
  asyncHandler(financialEntriesController.uploadFinancialEntryPaymentReceipt)
);
