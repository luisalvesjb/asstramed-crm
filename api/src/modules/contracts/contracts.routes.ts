import { Router } from "express";
import * as contractsController from "./contracts.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";

export const contractsRoutes = Router();

contractsRoutes.use(authMiddleware);

contractsRoutes.get("/", permissionMiddleware([PERMISSIONS.CONTRACTS_READ]), contractsController.listContracts);
contractsRoutes.post("/", permissionMiddleware([PERMISSIONS.CONTRACTS_WRITE]), contractsController.createContract);
