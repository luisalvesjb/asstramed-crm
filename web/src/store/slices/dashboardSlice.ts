import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../services/api";
import {
  Activity,
  ActivityStatus,
  ApiUser,
  Company,
  CompanyMessage,
  DashboardResponse
} from "../../types/api";
import type { RootState } from "../index";

interface DashboardFilters {
  date: string;
  status: ActivityStatus;
  companyId: string;
  responsibleId: string;
  tagKey: string;
}

interface DashboardState {
  filters: DashboardFilters;
  loading: boolean;
  error: string | null;
  kpis: {
    resolved: number;
    unresolved: number;
    totalOpen: number;
  };
  messages: {
    openByPriority: {
      alta: number;
      media: number;
      baixa: number;
      total: number;
    };
    highlighted: CompanyMessage[];
  };
  activities: Activity[];
  companies: Company[];
  users: ApiUser[];
  supportLoading: boolean;
  modalOpen: boolean;
  createLoading: boolean;
  actionLoadingById: Record<string, boolean>;
  page: number;
  pageSize: number;
}

interface CreateTaskInput {
  companyId: string;
  responsibleId: string;
  dueDate?: string;
  activityHtml: string;
  tags: string[];
  status: ActivityStatus;
}

function todayAsInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const initialState: DashboardState = {
  filters: {
    date: todayAsInputDate(),
    status: "PENDENTE",
    companyId: "",
    responsibleId: "",
    tagKey: ""
  },
  loading: false,
  error: null,
  kpis: {
    resolved: 0,
    unresolved: 0,
    totalOpen: 0
  },
  messages: {
    openByPriority: {
      alta: 0,
      media: 0,
      baixa: 0,
      total: 0
    },
    highlighted: []
  },
  activities: [],
  companies: [],
  users: [],
  supportLoading: false,
  modalOpen: false,
  createLoading: false,
  actionLoadingById: {},
  page: 1,
  pageSize: 10
};

export const fetchDashboardSupportData = createAsyncThunk<
  { companies: Company[]; users: ApiUser[] },
  void,
  { state: RootState }
>("dashboard/fetchSupportData", async (_, { getState }) => {
  const state = getState();
  const canReadCompanies =
    Boolean(state.auth.user?.isAdmin) || state.auth.permissions.includes("companies.read");
  const canReadUsers = Boolean(state.auth.user?.isAdmin) || state.auth.permissions.includes("users.read");

  const [companiesResponse, usersResponse] = await Promise.all([
    canReadCompanies ? api.get<Company[]>("/companies") : Promise.resolve({ data: [] as Company[] }),
    canReadUsers ? api.get<ApiUser[]>("/users") : Promise.resolve({ data: [] as ApiUser[] })
  ]);

  return {
    companies: companiesResponse.data,
    users: usersResponse.data
  };
});

export const fetchDashboardData = createAsyncThunk<DashboardResponse, void, { state: RootState }>(
  "dashboard/fetchData",
  async (_, { getState }) => {
    const filters = getState().dashboard.filters;

    const response = await api.get<DashboardResponse>("/dashboard/activities", {
      params: {
        date: filters.date,
        status: filters.status,
        companyId: filters.companyId || undefined,
        responsibleId: filters.responsibleId || undefined,
        tagKey: filters.tagKey || undefined
      }
    });

    return response.data;
  }
);

export const createDashboardTask = createAsyncThunk<void, CreateTaskInput, { state: RootState }>(
  "dashboard/createTask",
  async (payload, { dispatch }) => {
    const plainText = stripHtml(payload.activityHtml);
    const title = plainText.slice(0, 120);

    if (title.length < 2) {
      throw new Error("Descricao da atividade muito curta.");
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

    await dispatch(fetchDashboardData()).unwrap();
  }
);

export const updateDashboardActivityStatus = createAsyncThunk<
  { id: string; status: ActivityStatus },
  { id: string; status: ActivityStatus },
  { state: RootState }
>("dashboard/updateActivityStatus", async (payload, { dispatch }) => {
  await api.patch(`/activities/${payload.id}/status`, { status: payload.status });
  await dispatch(fetchDashboardData()).unwrap();
  return payload;
});

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setDashboardFilters(state, action: PayloadAction<Partial<DashboardFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    resetDashboardFilters(state) {
      state.filters = {
        date: todayAsInputDate(),
        status: "PENDENTE",
        companyId: "",
        responsibleId: "",
        tagKey: ""
      };
      state.page = 1;
    },
    openTaskModal(state) {
      state.modalOpen = true;
    },
    closeTaskModal(state) {
      state.modalOpen = false;
    },
    setDashboardPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setDashboardPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
      state.page = 1;
    },
    clearDashboardError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardSupportData.pending, (state) => {
        state.supportLoading = true;
      })
      .addCase(fetchDashboardSupportData.fulfilled, (state, action) => {
        state.supportLoading = false;
        state.companies = action.payload.companies;
        state.users = action.payload.users;
      })
      .addCase(fetchDashboardSupportData.rejected, (state) => {
        state.supportLoading = false;
        state.companies = [];
        state.users = [];
      })
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.kpis = action.payload.kpis;
        state.activities = action.payload.activities;
        state.messages = action.payload.messages;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Falha ao carregar dashboard";
      })
      .addCase(createDashboardTask.pending, (state) => {
        state.createLoading = true;
      })
      .addCase(createDashboardTask.fulfilled, (state) => {
        state.createLoading = false;
        state.modalOpen = false;
      })
      .addCase(createDashboardTask.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.error.message ?? "Falha ao criar atividade";
      })
      .addCase(updateDashboardActivityStatus.pending, (state, action) => {
        state.actionLoadingById[action.meta.arg.id] = true;
      })
      .addCase(updateDashboardActivityStatus.fulfilled, (state, action) => {
        delete state.actionLoadingById[action.payload.id];
      })
      .addCase(updateDashboardActivityStatus.rejected, (state, action) => {
        delete state.actionLoadingById[action.meta.arg.id];
        state.error = action.error.message ?? "Falha ao atualizar atividade";
      });
  }
});

export const {
  setDashboardFilters,
  resetDashboardFilters,
  openTaskModal,
  closeTaskModal,
  setDashboardPage,
  setDashboardPageSize,
  clearDashboardError
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
