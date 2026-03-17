export const PERMISSIONS = {
  DASHBOARD_READ: "dashboard.read",
  MESSAGES_READ: "messages.read",
  MESSAGES_WRITE: "messages.write",
  MESSAGES_RESOLVE: "messages.resolve",
  ACTIVITIES_READ: "activities.read",
  ACTIVITIES_CREATE: "activities.create",
  ACTIVITIES_FINISH: "activities.finish",
  COMPANIES_READ: "companies.read",
  COMPANIES_WRITE: "companies.write",
  DOCUMENTS_READ: "documents.read",
  DOCUMENTS_WRITE: "documents.write",
  CONTRACTS_READ: "contracts.read",
  CONTRACTS_WRITE: "contracts.write",
  CONTRACT_VALUES_READ: "contracts.values.read",
  USERS_READ: "users.read",
  USERS_WRITE: "users.write",
  USERS_PROFILE_EDIT: "users.profile.edit",
  USERS_ACTIVATE: "users.activate",
  USERS_DELETE: "users.delete",
  PERMISSIONS_MANAGE: "permissions.manage",
  REPORTS_READ: "reports.read",
  FINANCE_READ: "finance.read",
  FINANCE_WRITE: "finance.write",
  FINANCE_SETTINGS: "finance.settings",
  FINANCE_REPORTS: "finance.reports"
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
