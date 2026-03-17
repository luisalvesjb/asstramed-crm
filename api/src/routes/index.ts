import { Router } from "express";
import { authRoutes } from "../modules/auth";
import { usersRoutes } from "../modules/users";
import { companiesRoutes } from "../modules/companies";
import { activitiesRoutes } from "../modules/activities";
import { documentsRoutes } from "../modules/documents";
import { contractsRoutes } from "../modules/contracts";
import { dashboardRoutes } from "../modules/dashboard";
import { reportsRoutes } from "../modules/reports";
import { featureFlagsRoutes } from "../modules/feature-flags";
import { auditLogRoutes } from "../modules/audit-log";
import { profilesRoutes } from "../modules/profiles";
import { financialSettingsRoutes } from "../modules/financial-settings";
import { financialEntriesRoutes } from "../modules/financial-entries";
import { financialReportsRoutes } from "../modules/financial-reports";
import { messagesRoutes } from "../modules/messages";

export const routes = Router();

routes.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);
routes.use("/companies", companiesRoutes);
routes.use("/activities", activitiesRoutes);
routes.use("/documents", documentsRoutes);
routes.use("/contracts", contractsRoutes);
routes.use("/dashboard", dashboardRoutes);
routes.use("/reports", reportsRoutes);
routes.use("/feature-flags", featureFlagsRoutes);
routes.use("/audit-logs", auditLogRoutes);
routes.use("/profiles", profilesRoutes);
routes.use("/financial/settings", financialSettingsRoutes);
routes.use("/financial/entries", financialEntriesRoutes);
routes.use("/financial/reports", financialReportsRoutes);
routes.use("/messages", messagesRoutes);
