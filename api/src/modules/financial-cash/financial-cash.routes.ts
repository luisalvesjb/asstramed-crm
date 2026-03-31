import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as financialCashController from "./financial-cash.controller";
import { asyncHandler } from "../../utils/async-handler";

export const financialCashRoutes = Router();

financialCashRoutes.use(authMiddleware);

financialCashRoutes.get(
  "/overview",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_READ]),
  asyncHandler(financialCashController.getCashOverview)
);

financialCashRoutes.post(
  "/open",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_WRITE]),
  asyncHandler(financialCashController.openCashBox)
);

financialCashRoutes.post(
  "/:id/movements",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_WRITE]),
  asyncHandler(financialCashController.addCashMovement)
);

financialCashRoutes.post(
  "/:id/close",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_CLOSE]),
  asyncHandler(financialCashController.closeCashBox)
);
