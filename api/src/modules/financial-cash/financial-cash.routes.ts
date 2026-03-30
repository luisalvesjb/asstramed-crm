import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as financialCashController from "./financial-cash.controller";

export const financialCashRoutes = Router();

financialCashRoutes.use(authMiddleware);

financialCashRoutes.get(
  "/overview",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_READ]),
  financialCashController.getCashOverview
);

financialCashRoutes.post(
  "/open",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_WRITE]),
  financialCashController.openCashBox
);

financialCashRoutes.post(
  "/:id/movements",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_WRITE]),
  financialCashController.addCashMovement
);

financialCashRoutes.post(
  "/:id/close",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_CLOSE]),
  financialCashController.closeCashBox
);
