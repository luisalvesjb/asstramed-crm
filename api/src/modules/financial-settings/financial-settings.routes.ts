import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import * as financialSettingsController from "./financial-settings.controller";

export const financialSettingsRoutes = Router();

financialSettingsRoutes.use(authMiddleware);

financialSettingsRoutes.get(
  "/categories",
  permissionMiddleware([PERMISSIONS.FINANCE_READ]),
  financialSettingsController.listCategories
);
financialSettingsRoutes.post(
  "/categories",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  financialSettingsController.createCategory
);
financialSettingsRoutes.patch(
  "/categories/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  financialSettingsController.updateCategory
);
financialSettingsRoutes.delete(
  "/categories/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  financialSettingsController.deactivateCategory
);

financialSettingsRoutes.get(
  "/cost-centers",
  permissionMiddleware([PERMISSIONS.FINANCE_READ]),
  financialSettingsController.listCostCenters
);
financialSettingsRoutes.post(
  "/cost-centers",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  financialSettingsController.createCostCenter
);
financialSettingsRoutes.patch(
  "/cost-centers/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  financialSettingsController.updateCostCenter
);
financialSettingsRoutes.delete(
  "/cost-centers/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  financialSettingsController.deactivateCostCenter
);

financialSettingsRoutes.get(
  "/payment-methods",
  permissionMiddleware([PERMISSIONS.FINANCE_READ]),
  financialSettingsController.listPaymentMethods
);
financialSettingsRoutes.post(
  "/payment-methods",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  financialSettingsController.createPaymentMethod
);
financialSettingsRoutes.patch(
  "/payment-methods/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  financialSettingsController.updatePaymentMethod
);
financialSettingsRoutes.delete(
  "/payment-methods/:id",
  permissionMiddleware([PERMISSIONS.FINANCE_SETTINGS]),
  financialSettingsController.deactivatePaymentMethod
);
