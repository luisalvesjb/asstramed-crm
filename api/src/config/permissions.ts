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

export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS);

export interface SystemProfileTemplate {
  key: string;
  name: string;
  description: string;
  isAdmin: boolean;
  permissions: string[];
}

export const SYSTEM_PROFILE_TEMPLATES: SystemProfileTemplate[] = [
  {
    key: "ADMIN",
    name: "Administrador",
    description: "Perfil administrativo do sistema",
    isAdmin: true,
    permissions: ALL_PERMISSION_KEYS
  },
  {
    key: "GESTOR",
    name: "Gestor",
    description: "Perfil gestor",
    isAdmin: false,
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.MESSAGES_READ,
      PERMISSIONS.MESSAGES_WRITE,
      PERMISSIONS.MESSAGES_RESOLVE,
      PERMISSIONS.ACTIVITIES_READ,
      PERMISSIONS.ACTIVITIES_CREATE,
      PERMISSIONS.ACTIVITIES_FINISH,
      PERMISSIONS.COMPANIES_READ,
      PERMISSIONS.COMPANIES_WRITE,
      PERMISSIONS.DOCUMENTS_READ,
      PERMISSIONS.DOCUMENTS_WRITE,
      PERMISSIONS.CONTRACTS_READ,
      PERMISSIONS.CONTRACTS_WRITE,
      PERMISSIONS.CONTRACT_VALUES_READ,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.FINANCE_READ,
      PERMISSIONS.FINANCE_WRITE,
      PERMISSIONS.FINANCE_SETTINGS,
      PERMISSIONS.FINANCE_REPORTS
    ]
  },
  {
    key: "TECNICO",
    name: "Tecnico",
    description: "Perfil tecnico",
    isAdmin: false,
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.MESSAGES_READ,
      PERMISSIONS.MESSAGES_WRITE,
      PERMISSIONS.ACTIVITIES_READ,
      PERMISSIONS.ACTIVITIES_CREATE,
      PERMISSIONS.ACTIVITIES_FINISH,
      PERMISSIONS.COMPANIES_READ
    ]
  },
  {
    key: "FINANCEIRO",
    name: "Financeiro",
    description: "Perfil financeiro",
    isAdmin: false,
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.MESSAGES_READ,
      PERMISSIONS.FINANCE_READ,
      PERMISSIONS.FINANCE_WRITE,
      PERMISSIONS.FINANCE_SETTINGS,
      PERMISSIONS.FINANCE_REPORTS
    ]
  }
];

export function getSystemProfileTemplateByKey(profileKey: string): SystemProfileTemplate | undefined {
  return SYSTEM_PROFILE_TEMPLATES.find((template) => template.key === profileKey);
}
