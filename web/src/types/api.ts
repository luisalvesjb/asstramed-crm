export type ActivityStatus = "PENDENTE" | "EM_EXECUCAO" | "CONCLUIDA" | "CANCELADA";

export interface ApiUser {
  id: string;
  name: string;
  login: string;
  email?: string | null;
  profileId: string;
  profileKey: string;
  profileName: string;
  isAdmin: boolean;
  avatarPath?: string | null;
  avatarMimeType?: string | null;
  lastAccessAt?: string | null;
  createdAt?: string;
  isActive?: boolean;
}

export interface Company {
  id: string;
  code?: number;
  name: string;
  legalName?: string | null;
  city?: string | null;
  state?: string | null;
  status: string;
  nextCycleDate?: string | null;
  personalDocument?: string | null;
  personalEmail?: string | null;
  personalPhone?: string | null;
  personalResponsible?: string | null;
  personalNotes?: string | null;
  logoPath?: string | null;
  logoMimeType?: string | null;
}

export interface Tag {
  id: string;
  key: string;
  label: string;
  color?: string | null;
}

export interface Activity {
  id: string;
  companyId: string;
  orderExec: number;
  title: string;
  description?: string | null;
  priority: MessagePriority;
  status: ActivityStatus;
  assignedToId: string;
  createdById: string;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  company: Company;
  assignedTo: ApiUser;
  createdBy: ApiUser;
  tags: Array<{ tag: Tag }>;
  messages?: ActivityMessage[];
  _count?: {
    messages: number;
  };
}

export interface DashboardResponse {
  filters: {
    date: string;
    status: ActivityStatus;
    companyId: string | null;
    responsibleId: string | null;
    tagKey: string | null;
  };
  kpis: {
    resolved: number;
    unresolved: number;
    totalOpen: number;
  };
  activities: Activity[];
  activityInsights: {
    openByPriority: {
      alta: number;
      media: number;
      baixa: number;
      total: number;
    };
    highlighted: Activity[];
    hasOpenHighPriority: boolean;
    recentMessages: ActivityInteraction[];
  };
}

export type MessagePriority = "ALTA" | "MEDIA" | "BAIXA";

export interface ActivityMessage {
  id: string;
  activityId: string;
  content: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

export interface ActivityInteraction {
  id: string;
  title: string;
  description?: string | null;
  priority: MessagePriority;
  status: ActivityStatus;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  assignedTo: {
    id: string;
    name: string;
  };
  company: {
    id: string;
    code?: number;
    name: string;
  };
}

export interface Permission {
  id: string;
  key: string;
  description?: string | null;
}

export interface Profile {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isAdmin: boolean;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissionKeys: string[];
}

export interface ProfilesResponse {
  profiles: Profile[];
  permissionsCatalog: Permission[];
}

export interface CompanyContact {
  id: string;
  companyId: string;
  name: string;
  role?: string | null;
  phone?: string | null;
  hasWhatsapp?: boolean;
  email?: string | null;
  createdAt: string;
}

export interface CompanyAddress {
  id: string;
  companyId: string;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface DocumentItem {
  id: string;
  companyId: string;
  name: string;
  title: string;
  description?: string | null;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  companyId: string;
  value?: string | null;
  billingCycle?: string | null;
  dueDay?: number | null;
  notes?: string | null;
  createdAt: string;
  documents: Array<{ document: DocumentItem }>;
}

export interface CompanyDetails extends Company {
  contacts: CompanyContact[];
  address: CompanyAddress | null;
  documents: DocumentItem[];
  contracts: Contract[];
}

export type FinancialEntryStatus = "PENDENTE" | "PAGO" | "VENCIDO" | "CANCELADO";
export type FinancialRecurrenceCycle =
  | "NONE"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUAL"
  | "YEARLY";

export interface FinancialCategory {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CostCenter {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialEntry {
  id: string;
  title: string;
  description?: string | null;
  amount: string | number;
  amountPaid?: string | number | null;
  status: FinancialEntryStatus;
  dueDate: string;
  paymentDate?: string | null;
  launchDate: string;
  isFixed: boolean;
  recurrenceCycle: FinancialRecurrenceCycle;
  nextRecurrenceDate?: string | null;
  recurrenceEndDate?: string | null;
  parentEntryId?: string | null;
  categoryId: string;
  costCenterId?: string | null;
  paymentMethodId?: string | null;
  paymentKey?: string | null;
  bankSlipPath?: string | null;
  bankSlipMimeType?: string | null;
  paymentReceiptPath?: string | null;
  paymentReceiptMimeType?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  category: FinancialCategory;
  costCenter?: CostCenter | null;
  paymentMethod?: PaymentMethod | null;
  createdBy: ApiUser;
  parentEntry?: { id: string; title: string; dueDate: string } | null;
}
