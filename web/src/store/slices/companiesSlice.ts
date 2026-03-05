import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../services/api";
import { Company } from "../../types/api";

interface CompaniesFilters {
  search: string;
  status: string;
}

interface CreateCompanyForm {
  name: string;
  legalName: string;
  city: string;
  state: string;
  status: string;
  nextCycleDate: string;
}

interface CompaniesState {
  items: Company[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  modalOpen: boolean;
  filters: CompaniesFilters;
  form: CreateCompanyForm;
  page: number;
  pageSize: number;
}

const initialForm: CreateCompanyForm = {
  name: "",
  legalName: "",
  city: "",
  state: "",
  status: "ATIVA",
  nextCycleDate: ""
};

const initialState: CompaniesState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
  modalOpen: false,
  filters: {
    search: "",
    status: ""
  },
  form: initialForm,
  page: 1,
  pageSize: 10
};

export const fetchCompanies = createAsyncThunk<Company[], void, { rejectValue: string }>(
  "companies/fetchCompanies",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { companies: CompaniesState };
      const filters = state.companies.filters;

      const response = await api.get<Company[]>("/companies", {
        params: {
          search: filters.search || undefined,
          status: filters.status || undefined
        }
      });

      return response.data;
    } catch {
      return rejectWithValue("Falha ao carregar empresas.");
    }
  }
);

export const createCompany = createAsyncThunk<void, void, { rejectValue: string }>(
  "companies/createCompany",
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { companies: CompaniesState };
      const form = state.companies.form;

      if (!form.name.trim()) {
        return rejectWithValue("Nome da empresa e obrigatorio.");
      }

      await api.post("/companies", {
        name: form.name.trim(),
        legalName: form.legalName.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        status: form.status || "ATIVA",
        nextCycleDate: form.nextCycleDate || undefined
      });

      dispatch(resetCompaniesForm());
      dispatch(closeCompaniesModal());
      await dispatch(fetchCompanies()).unwrap();
    } catch {
      return rejectWithValue("Falha ao criar empresa.");
    }
  }
);

const companiesSlice = createSlice({
  name: "companies",
  initialState,
  reducers: {
    setCompaniesFilters(state, action: PayloadAction<Partial<CompaniesFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    resetCompaniesFilters(state) {
      state.filters = {
        search: "",
        status: ""
      };
      state.page = 1;
    },
    openCompaniesModal(state) {
      state.modalOpen = true;
    },
    closeCompaniesModal(state) {
      state.modalOpen = false;
    },
    setCompaniesForm(state, action: PayloadAction<Partial<CreateCompanyForm>>) {
      state.form = { ...state.form, ...action.payload };
    },
    resetCompaniesForm(state) {
      state.form = initialForm;
    },
    clearCompaniesError(state) {
      state.error = null;
    },
    setCompaniesPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setCompaniesPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
      state.page = 1;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.items = [];
        state.error = action.payload ?? "Falha ao carregar empresas.";
      })
      .addCase(createCompany.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createCompany.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? "Falha ao criar empresa.";
      });
  }
});

export const {
  setCompaniesFilters,
  resetCompaniesFilters,
  openCompaniesModal,
  closeCompaniesModal,
  setCompaniesForm,
  resetCompaniesForm,
  clearCompaniesError,
  setCompaniesPage,
  setCompaniesPageSize
} = companiesSlice.actions;

export default companiesSlice.reducer;
