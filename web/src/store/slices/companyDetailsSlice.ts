import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../services/api";
import { Activity, ActivityStatus, ApiUser, CompanyDetails, DocumentItem } from "../../types/api";
import { resolveAssetUrl } from "../../utils/asset-url";

export type CompanyDetailsTab =
  | "activities"
  | "contacts"
  | "address"
  | "documents"
  | "contracts"
  | "personal-info";

interface ContactForm {
  name: string;
  role: string;
  phone: string;
  email: string;
}

interface AddressForm {
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

interface ContractForm {
  value: string;
  billingCycle: string;
  dueDay: string;
  notes: string;
  documentIds: string[];
}

interface PersonalInfoForm {
  personalDocument: string;
  personalEmail: string;
  personalPhone: string;
  personalResponsible: string;
  personalNotes: string;
  logoFile: File | null;
}

interface NewTaskPayload {
  companyId: string;
  responsibleId: string;
  dueDate?: string;
  activityHtml: string;
  tags: string[];
  status: ActivityStatus;
}

interface SavePersonalInfoPayload {
  croppedLogoBlob?: Blob;
  logoFileName?: string;
}

interface CompanyDetailsState {
  companyId: string | null;
  tab: CompanyDetailsTab;
  loading: boolean;
  saving: boolean;
  error: string | null;

  company: CompanyDetails | null;
  activities: Activity[];
  users: ApiUser[];

  contactForm: ContactForm;
  addressForm: AddressForm;
  documentTitle: string;
  documentDescription: string;
  documentFile: File | null;
  contractForm: ContractForm;
  personalInfoForm: PersonalInfoForm;

  taskModalOpen: boolean;
  contactModalOpen: boolean;
  addressModalOpen: boolean;
  documentModalOpen: boolean;
  contractModalOpen: boolean;
  personalInfoModalOpen: boolean;

  activitiesPage: number;
  activitiesPageSize: number;
  contactsPage: number;
  contactsPageSize: number;
  documentsPage: number;
  documentsPageSize: number;
  contractsPage: number;
  contractsPageSize: number;
}

const initialContactForm: ContactForm = {
  name: "",
  role: "",
  phone: "",
  email: ""
};

const initialAddressForm: AddressForm = {
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  zipCode: ""
};

const initialContractForm: ContractForm = {
  value: "",
  billingCycle: "",
  dueDay: "",
  notes: "",
  documentIds: []
};

const initialPersonalInfoForm: PersonalInfoForm = {
  personalDocument: "",
  personalEmail: "",
  personalPhone: "",
  personalResponsible: "",
  personalNotes: "",
  logoFile: null
};

const initialState: CompanyDetailsState = {
  companyId: null,
  tab: "activities",
  loading: false,
  saving: false,
  error: null,

  company: null,
  activities: [],
  users: [],

  contactForm: initialContactForm,
  addressForm: initialAddressForm,
  documentTitle: "",
  documentDescription: "",
  documentFile: null,
  contractForm: initialContractForm,
  personalInfoForm: initialPersonalInfoForm,

  taskModalOpen: false,
  contactModalOpen: false,
  addressModalOpen: false,
  documentModalOpen: false,
  contractModalOpen: false,
  personalInfoModalOpen: false,

  activitiesPage: 1,
  activitiesPageSize: 10,
  contactsPage: 1,
  contactsPageSize: 10,
  documentsPage: 1,
  documentsPageSize: 10,
  contractsPage: 1,
  contractsPageSize: 10
};

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function resolveDocumentUrl(filePath: string): string {
  return resolveAssetUrl(filePath) ?? filePath;
}

export function resolveCompanyLogoUrl(logoPath?: string | null): string | null {
  return resolveAssetUrl(logoPath);
}

export const fetchCompanyDetails = createAsyncThunk<
  { company: CompanyDetails; activities: Activity[]; users: ApiUser[] },
  { companyId: string; canReadUsers: boolean },
  { rejectValue: string }
>("companyDetails/fetchCompanyDetails", async ({ companyId, canReadUsers }, { rejectWithValue }) => {
  try {
    const [companyResponse, activitiesResponse, usersResponse] = await Promise.all([
      api.get<CompanyDetails>(`/companies/${companyId}`),
      api.get<Activity[]>("/activities", { params: { companyId } }),
      canReadUsers
        ? api.get<ApiUser[]>("/users").catch(() => ({ data: [] as ApiUser[] }))
        : Promise.resolve({ data: [] as ApiUser[] })
    ]);

    return {
      company: companyResponse.data,
      activities: activitiesResponse.data,
      users: usersResponse.data
    };
  } catch {
    return rejectWithValue("Falha ao carregar dados da empresa.");
  }
});

export const createCompanyTask = createAsyncThunk<
  void,
  NewTaskPayload,
  { state: { companyDetails: CompanyDetailsState }; rejectValue: string }
>("companyDetails/createCompanyTask", async (payload, { dispatch, getState, rejectWithValue }) => {
  try {
    const plainText = stripHtml(payload.activityHtml);
    const title = plainText.slice(0, 120);

    if (title.length < 2) {
      return rejectWithValue("Descricao da atividade muito curta.");
    }

    const created = await api.post<Activity>("/activities", {
      companyId: payload.companyId,
      assignedToId: payload.responsibleId,
      dueDate: payload.dueDate,
      title,
      description: payload.activityHtml,
      tagKeys: payload.tags
    });

    if (payload.status !== "PENDENTE") {
      await api.patch(`/activities/${created.data.id}/status`, {
        status: payload.status
      });
    }

    const companyId = getState().companyDetails.companyId;

    if (!companyId) {
      return;
    }

    await dispatch(fetchCompanyDetails({ companyId, canReadUsers: true })).unwrap();
  } catch {
    return rejectWithValue("Nao foi possivel criar atividade.");
  }
});

export const updateCompanyActivityStatus = createAsyncThunk<
  void,
  { id: string; status: ActivityStatus },
  { state: { companyDetails: CompanyDetailsState }; rejectValue: string }
>("companyDetails/updateCompanyActivityStatus", async (payload, { dispatch, getState, rejectWithValue }) => {
  try {
    await api.patch(`/activities/${payload.id}/status`, { status: payload.status });

    const companyId = getState().companyDetails.companyId;

    if (!companyId) {
      return;
    }

    await dispatch(fetchCompanyDetails({ companyId, canReadUsers: true })).unwrap();
  } catch {
    return rejectWithValue("Nao foi possivel atualizar status da atividade.");
  }
});

export const createCompanyContact = createAsyncThunk<
  void,
  void,
  { state: { companyDetails: CompanyDetailsState }; rejectValue: string }
>("companyDetails/createCompanyContact", async (_, { dispatch, getState, rejectWithValue }) => {
  try {
    const state = getState().companyDetails;

    if (!state.companyId || !state.contactForm.name.trim()) {
      return rejectWithValue("Nome do contato e obrigatorio.");
    }

    await api.post(`/companies/${state.companyId}/contacts`, {
      name: state.contactForm.name.trim(),
      role: state.contactForm.role.trim() || undefined,
      phone: state.contactForm.phone.trim() || undefined,
      email: state.contactForm.email.trim() || undefined
    });

    await dispatch(fetchCompanyDetails({ companyId: state.companyId, canReadUsers: true })).unwrap();
    dispatch(resetContactForm());
  } catch {
    return rejectWithValue("Nao foi possivel criar contato.");
  }
});

export const saveCompanyAddress = createAsyncThunk<
  void,
  void,
  { state: { companyDetails: CompanyDetailsState }; rejectValue: string }
>("companyDetails/saveCompanyAddress", async (_, { dispatch, getState, rejectWithValue }) => {
  try {
    const state = getState().companyDetails;

    if (!state.companyId) {
      return rejectWithValue("Empresa invalida.");
    }

    await api.put(`/companies/${state.companyId}/address`, {
      street: state.addressForm.street || undefined,
      number: state.addressForm.number || undefined,
      complement: state.addressForm.complement || undefined,
      district: state.addressForm.district || undefined,
      city: state.addressForm.city || undefined,
      state: state.addressForm.state || undefined,
      zipCode: state.addressForm.zipCode || undefined
    });

    await dispatch(fetchCompanyDetails({ companyId: state.companyId, canReadUsers: true })).unwrap();
  } catch {
    return rejectWithValue("Nao foi possivel salvar endereco.");
  }
});

export const uploadCompanyDocument = createAsyncThunk<
  void,
  void,
  { state: { companyDetails: CompanyDetailsState }; rejectValue: string }
>("companyDetails/uploadCompanyDocument", async (_, { dispatch, getState, rejectWithValue }) => {
  try {
    const state = getState().companyDetails;

    if (!state.companyId || !state.documentFile) {
      return rejectWithValue("Selecione um arquivo para upload.");
    }

    if (!state.documentTitle.trim()) {
      return rejectWithValue("Informe o titulo do documento.");
    }

    const formData = new FormData();
    formData.append("companyId", state.companyId);
    formData.append("file", state.documentFile);
    formData.append("title", state.documentTitle.trim());

    if (state.documentDescription.trim()) {
      formData.append("description", state.documentDescription.trim());
    }

    await api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    await dispatch(fetchCompanyDetails({ companyId: state.companyId, canReadUsers: true })).unwrap();
    dispatch(setDocumentTitle(""));
    dispatch(setDocumentDescription(""));
    dispatch(setDocumentFile(null));
  } catch {
    return rejectWithValue("Nao foi possivel enviar documento.");
  }
});

export const archiveCompanyDocument = createAsyncThunk<
  void,
  { documentId: string },
  { state: { companyDetails: CompanyDetailsState }; rejectValue: string }
>("companyDetails/archiveCompanyDocument", async ({ documentId }, { dispatch, getState, rejectWithValue }) => {
  try {
    await api.patch(`/documents/${documentId}/archive`);

    const companyId = getState().companyDetails.companyId;

    if (!companyId) {
      return;
    }

    await dispatch(fetchCompanyDetails({ companyId, canReadUsers: true })).unwrap();
  } catch {
    return rejectWithValue("Nao foi possivel arquivar documento.");
  }
});

export const createCompanyContract = createAsyncThunk<
  void,
  void,
  { state: { companyDetails: CompanyDetailsState }; rejectValue: string }
>("companyDetails/createCompanyContract", async (_, { dispatch, getState, rejectWithValue }) => {
  try {
    const state = getState().companyDetails;

    if (!state.companyId) {
      return rejectWithValue("Empresa invalida.");
    }

    if (!state.contractForm.documentIds.length) {
      return rejectWithValue("Selecione ao menos um documento para o contrato.");
    }

    await api.post("/contracts", {
      companyId: state.companyId,
      value: state.contractForm.value ? Number(state.contractForm.value) : undefined,
      billingCycle: state.contractForm.billingCycle || undefined,
      dueDay: state.contractForm.dueDay ? Number(state.contractForm.dueDay) : undefined,
      notes: state.contractForm.notes || undefined,
      documentIds: state.contractForm.documentIds
    });

    await dispatch(fetchCompanyDetails({ companyId: state.companyId, canReadUsers: true })).unwrap();
    dispatch(resetContractForm());
  } catch {
    return rejectWithValue("Falha ao criar contrato.");
  }
});

export const saveCompanyPersonalInfo = createAsyncThunk<
  void,
  SavePersonalInfoPayload,
  { state: { companyDetails: CompanyDetailsState }; rejectValue: string }
>("companyDetails/saveCompanyPersonalInfo", async (payload, { dispatch, getState, rejectWithValue }) => {
  try {
    const state = getState().companyDetails;

    if (!state.companyId) {
      return rejectWithValue("Empresa invalida.");
    }

    const formData = new FormData();
    formData.append("personalDocument", state.personalInfoForm.personalDocument || "");
    formData.append("personalEmail", state.personalInfoForm.personalEmail || "");
    formData.append("personalPhone", state.personalInfoForm.personalPhone || "");
    formData.append("personalResponsible", state.personalInfoForm.personalResponsible || "");
    formData.append("personalNotes", state.personalInfoForm.personalNotes || "");

    if (payload.croppedLogoBlob) {
      const fileName = payload.logoFileName || "logo.png";
      formData.append("logo", payload.croppedLogoBlob, fileName);
    } else if (state.personalInfoForm.logoFile) {
      formData.append("logo", state.personalInfoForm.logoFile, state.personalInfoForm.logoFile.name);
    }

    await api.put(`/companies/${state.companyId}/personal-info`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    await dispatch(fetchCompanyDetails({ companyId: state.companyId, canReadUsers: true })).unwrap();
    dispatch(setPersonalInfoForm({ logoFile: null }));
  } catch {
    return rejectWithValue("Nao foi possivel salvar informacoes pessoais.");
  }
});

const companyDetailsSlice = createSlice({
  name: "companyDetails",
  initialState,
  reducers: {
    setCompanyId(state, action: PayloadAction<string | null>) {
      state.companyId = action.payload;
    },
    setCompanyDetailsTab(state, action: PayloadAction<CompanyDetailsTab>) {
      state.tab = action.payload;
    },
    setContactForm(state, action: PayloadAction<Partial<ContactForm>>) {
      state.contactForm = { ...state.contactForm, ...action.payload };
    },
    resetContactForm(state) {
      state.contactForm = initialContactForm;
    },
    setAddressForm(state, action: PayloadAction<Partial<AddressForm>>) {
      state.addressForm = { ...state.addressForm, ...action.payload };
    },
    setDocumentTitle(state, action: PayloadAction<string>) {
      state.documentTitle = action.payload;
    },
    setDocumentDescription(state, action: PayloadAction<string>) {
      state.documentDescription = action.payload;
    },
    setDocumentFile(state, action: PayloadAction<File | null>) {
      state.documentFile = action.payload;
    },
    setContractForm(state, action: PayloadAction<Partial<ContractForm>>) {
      state.contractForm = { ...state.contractForm, ...action.payload };
    },
    resetContractForm(state) {
      state.contractForm = initialContractForm;
    },
    setPersonalInfoForm(state, action: PayloadAction<Partial<PersonalInfoForm>>) {
      state.personalInfoForm = { ...state.personalInfoForm, ...action.payload };
    },
    openCompanyTaskModal(state) {
      state.taskModalOpen = true;
    },
    closeCompanyTaskModal(state) {
      state.taskModalOpen = false;
    },
    openContactModal(state) {
      state.contactModalOpen = true;
    },
    closeContactModal(state) {
      state.contactModalOpen = false;
    },
    openAddressModal(state) {
      state.addressModalOpen = true;
    },
    closeAddressModal(state) {
      state.addressModalOpen = false;
    },
    openDocumentModal(state) {
      state.documentModalOpen = true;
    },
    closeDocumentModal(state) {
      state.documentModalOpen = false;
    },
    openContractModal(state) {
      state.contractModalOpen = true;
    },
    closeContractModal(state) {
      state.contractModalOpen = false;
    },
    openPersonalInfoModal(state) {
      state.personalInfoModalOpen = true;
    },
    closePersonalInfoModal(state) {
      state.personalInfoModalOpen = false;
    },
    clearCompanyDetailsError(state) {
      state.error = null;
    },
    setActivitiesPage(state, action: PayloadAction<number>) {
      state.activitiesPage = action.payload;
    },
    setActivitiesPageSize(state, action: PayloadAction<number>) {
      state.activitiesPageSize = action.payload;
      state.activitiesPage = 1;
    },
    setContactsPage(state, action: PayloadAction<number>) {
      state.contactsPage = action.payload;
    },
    setContactsPageSize(state, action: PayloadAction<number>) {
      state.contactsPageSize = action.payload;
      state.contactsPage = 1;
    },
    setDocumentsPage(state, action: PayloadAction<number>) {
      state.documentsPage = action.payload;
    },
    setDocumentsPageSize(state, action: PayloadAction<number>) {
      state.documentsPageSize = action.payload;
      state.documentsPage = 1;
    },
    setContractsPage(state, action: PayloadAction<number>) {
      state.contractsPage = action.payload;
    },
    setContractsPageSize(state, action: PayloadAction<number>) {
      state.contractsPageSize = action.payload;
      state.contractsPage = 1;
    },
    resetCompanyDetailsState() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanyDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.company = action.payload.company;
        state.activities = action.payload.activities;
        state.users = action.payload.users;

        state.addressForm = {
          street: action.payload.company.address?.street ?? "",
          number: action.payload.company.address?.number ?? "",
          complement: action.payload.company.address?.complement ?? "",
          district: action.payload.company.address?.district ?? "",
          city: action.payload.company.address?.city ?? "",
          state: action.payload.company.address?.state ?? "",
          zipCode: action.payload.company.address?.zipCode ?? ""
        };

        state.personalInfoForm = {
          personalDocument: action.payload.company.personalDocument ?? "",
          personalEmail: action.payload.company.personalEmail ?? "",
          personalPhone: action.payload.company.personalPhone ?? "",
          personalResponsible: action.payload.company.personalResponsible ?? "",
          personalNotes: action.payload.company.personalNotes ?? "",
          logoFile: null
        };
      })
      .addCase(fetchCompanyDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Falha ao carregar dados da empresa.";
      })
      .addMatcher(
        (action) =>
          action.type.startsWith("companyDetails/") &&
          action.type.endsWith("/pending") &&
          !action.type.includes("fetchCompanyDetails"),
        (state) => {
          state.saving = true;
        }
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("companyDetails/") &&
          action.type.endsWith("/fulfilled") &&
          !action.type.includes("fetchCompanyDetails"),
        (state, action: { type: string }) => {
          state.saving = false;

          if (action.type === "companyDetails/createCompanyTask/fulfilled") {
            state.taskModalOpen = false;
          }
          if (action.type === "companyDetails/createCompanyContact/fulfilled") {
            state.contactModalOpen = false;
          }
          if (action.type === "companyDetails/saveCompanyAddress/fulfilled") {
            state.addressModalOpen = false;
          }
          if (action.type === "companyDetails/uploadCompanyDocument/fulfilled") {
            state.documentModalOpen = false;
          }
          if (action.type === "companyDetails/createCompanyContract/fulfilled") {
            state.contractModalOpen = false;
          }
          if (action.type === "companyDetails/saveCompanyPersonalInfo/fulfilled") {
            state.personalInfoModalOpen = false;
          }
        }
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("companyDetails/") &&
          action.type.endsWith("/rejected") &&
          !action.type.includes("fetchCompanyDetails"),
        (state, action: { payload?: string }) => {
          state.saving = false;
          if (action.payload) {
            state.error = action.payload;
          }
        }
      );
  }
});

export const {
  setCompanyId,
  setCompanyDetailsTab,
  setContactForm,
  resetContactForm,
  setAddressForm,
  setDocumentTitle,
  setDocumentDescription,
  setDocumentFile,
  setContractForm,
  resetContractForm,
  setPersonalInfoForm,
  openCompanyTaskModal,
  closeCompanyTaskModal,
  openContactModal,
  closeContactModal,
  openAddressModal,
  closeAddressModal,
  openDocumentModal,
  closeDocumentModal,
  openContractModal,
  closeContractModal,
  openPersonalInfoModal,
  closePersonalInfoModal,
  clearCompanyDetailsError,
  setActivitiesPage,
  setActivitiesPageSize,
  setContactsPage,
  setContactsPageSize,
  setDocumentsPage,
  setDocumentsPageSize,
  setContractsPage,
  setContractsPageSize,
  resetCompanyDetailsState
} = companyDetailsSlice.actions;

export default companyDetailsSlice.reducer;
