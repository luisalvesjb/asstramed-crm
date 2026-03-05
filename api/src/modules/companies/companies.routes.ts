import { Router } from "express";
import * as companiesController from "./companies.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { companyLogoUpload } from "../../gateways/company-logo.gateway";

export const companiesRoutes = Router();

companiesRoutes.use(authMiddleware);

companiesRoutes.get("/", permissionMiddleware([PERMISSIONS.COMPANIES_READ]), companiesController.listCompanies);
companiesRoutes.post("/", permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]), companiesController.createCompany);
companiesRoutes.get("/:id", permissionMiddleware([PERMISSIONS.COMPANIES_READ]), companiesController.getCompanyById);
companiesRoutes.post(
  "/:id/contacts",
  permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]),
  companiesController.addCompanyContact
);
companiesRoutes.put(
  "/:id/address",
  permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]),
  companiesController.upsertCompanyAddress
);
companiesRoutes.put(
  "/:id/personal-info",
  permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]),
  companyLogoUpload.single("logo"),
  companiesController.upsertCompanyPersonalInfo
);
