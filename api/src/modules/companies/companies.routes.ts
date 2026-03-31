import { Router } from "express";
import * as companiesController from "./companies.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { companyLogoUpload } from "../../gateways/company-logo.gateway";
import { asyncHandler } from "../../utils/async-handler";

export const companiesRoutes = Router();

companiesRoutes.use(authMiddleware);

companiesRoutes.get("/", permissionMiddleware([PERMISSIONS.COMPANIES_READ]), asyncHandler(companiesController.listCompanies));
companiesRoutes.post("/", permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]), asyncHandler(companiesController.createCompany));
companiesRoutes.put("/:id", permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]), asyncHandler(companiesController.updateCompany));
companiesRoutes.get("/:id", permissionMiddleware([PERMISSIONS.COMPANIES_READ]), asyncHandler(companiesController.getCompanyById));
companiesRoutes.post(
  "/:id/contacts",
  permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]),
  asyncHandler(companiesController.addCompanyContact)
);
companiesRoutes.put(
  "/:id/contacts",
  permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]),
  asyncHandler(companiesController.replaceCompanyContacts)
);
companiesRoutes.put(
  "/:id/address",
  permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]),
  asyncHandler(companiesController.upsertCompanyAddress)
);
companiesRoutes.put(
  "/:id/personal-info",
  permissionMiddleware([PERMISSIONS.COMPANIES_WRITE]),
  companyLogoUpload.single("logo"),
  asyncHandler(companiesController.upsertCompanyPersonalInfo)
);
