import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as financialSettingsController from "./financial-settings.controller";
import { asyncHandler } from "../../utils/async-handler";

export const financialSettingsRoutes = Router();

financialSettingsRoutes.use(authMiddleware);

financialSettingsRoutes.get(
  "/categories",
  permissionMiddleware([PERMISSIONS.FINANCE_READ]),
  asyncHandler(financialSettingsController.listCategories)
);
financialSettingsRoutes.post(
  "/categories",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  asyncHandler(financialSettingsController.createCategory)
);
financialSettingsRoutes.patch(
  "/categories/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  asyncHandler(financialSettingsController.updateCategory)
);
financialSettingsRoutes.delete(
  "/categories/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  asyncHandler(financialSettingsController.deactivateCategory)
);

financialSettingsRoutes.get(
  "/cost-centers",
  permissionMiddleware([PERMISSIONS.FINANCE_READ]),
  asyncHandler(financialSettingsController.listCostCenters)
);
financialSettingsRoutes.post(
  "/cost-centers",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  asyncHandler(financialSettingsController.createCostCenter)
);
financialSettingsRoutes.patch(
  "/cost-centers/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  asyncHandler(financialSettingsController.updateCostCenter)
);
financialSettingsRoutes.delete(
  "/cost-centers/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  asyncHandler(financialSettingsController.deactivateCostCenter)
);

financialSettingsRoutes.get(
  "/payment-methods",
  permissionMiddleware([PERMISSIONS.FINANCE_READ]),
  asyncHandler(financialSettingsController.listPaymentMethods)
);
financialSettingsRoutes.post(
  "/payment-methods",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  asyncHandler(financialSettingsController.createPaymentMethod)
);
financialSettingsRoutes.patch(
  "/payment-methods/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  asyncHandler(financialSettingsController.updatePaymentMethod)
);
financialSettingsRoutes.delete(
  "/payment-methods/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  asyncHandler(financialSettingsController.deactivatePaymentMethod)
);

financialSettingsRoutes.get(
  "/cash-password",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_PASSWORD_MANAGE]),
  asyncHandler(financialSettingsController.getCashPasswordSettings)
);

financialSettingsRoutes.put(
  "/cash-password",
  permissionMiddleware([PERMISSIONS.FINANCE_CASH_PASSWORD_MANAGE]),
  asyncHandler(financialSettingsController.updateCashPassword)
);
