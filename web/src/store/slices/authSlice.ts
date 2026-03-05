import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../services/api";
import { Company } from "../../types/api";
import { LoginResponse, MeResponse, AuthUser } from "../../types/auth";
import {
  clearAuthStorage,
  clearSelectedCompany,
  getAccessToken,
  getRefreshToken,
  getSelectedCompany,
  setAccessToken,
  setRefreshToken,
  setSelectedCompany
} from "../../utils/auth-storage";
import type { RootState } from "../index";

interface AuthState {
  user: AuthUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  selectedCompanyId: string | null;
  topbarCompanies: Company[];
  topbarLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  permissions: [],
  isAuthenticated: Boolean(getAccessToken()),
  loading: false,
  initialized: false,
  error: null,
  selectedCompanyId: getSelectedCompany(),
  topbarCompanies: [],
  topbarLoading: false
};

function hasPermissionFromState(state: RootState, permission: string): boolean {
  if (state.auth.user?.isAdmin) {
    return true;
  }

  return state.auth.permissions.includes(permission);
}

export const loadTopbarCompanies = createAsyncThunk<Company[], void, { state: RootState }>(
  "auth/loadTopbarCompanies",
  async (_, { getState }) => {
    const state = getState();
    const canReadCompanies = hasPermissionFromState(state, "companies.read");

    if (!canReadCompanies) {
      return [];
    }

    const response = await api.get<Company[]>("/companies");
    return response.data;
  }
);

export const refreshProfile = createAsyncThunk<MeResponse, void, { state: RootState }>(
  "auth/refreshProfile",
  async () => {
    const response = await api.get<MeResponse>("/auth/me");
    return response.data;
  }
);

export const bootstrapAuth = createAsyncThunk<MeResponse | null, void, { state: RootState }>(
  "auth/bootstrap",
  async (_, { dispatch }) => {
    const token = getAccessToken();

    if (!token) {
      return null;
    }

    try {
      const profile = await dispatch(refreshProfile()).unwrap();
      await dispatch(loadTopbarCompanies()).unwrap();
      return profile;
    } catch {
      clearAuthStorage();
      clearSelectedCompany();
      return null;
    }
  }
);

export const loginUser = createAsyncThunk<LoginResponse, { email: string; password: string }, { state: RootState }>(
  "auth/login",
  async (payload) => {
    const response = await api.post<LoginResponse>("/auth/login", payload);

    setAccessToken(response.data.accessToken);
    setRefreshToken(response.data.refreshToken);

    return response.data;
  }
);

export const logoutUser = createAsyncThunk<void, void, { state: RootState }>(
  "auth/logout",
  async () => {
    const refreshToken = getRefreshToken();

    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch {
        // swallow logout network failure
      }
    }

    clearAuthStorage();
    clearSelectedCompany();
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSelectedCompanyId(state, action: PayloadAction<string | null>) {
      state.selectedCompanyId = action.payload;

      if (action.payload) {
        setSelectedCompany(action.payload);
      } else {
        clearSelectedCompany();
      }
    },
    setAuthFromContext(state, action: PayloadAction<{ user: AuthUser; permissions: string[] }>) {
      state.user = action.payload.user;
      state.permissions = action.payload.permissions;
      state.isAuthenticated = true;
      state.initialized = true;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;

        if (!action.payload) {
          state.user = null;
          state.permissions = [];
          state.isAuthenticated = false;
          state.topbarCompanies = [];
          return;
        }

        state.user = action.payload.user;
        state.permissions = action.payload.permissions;
        state.isAuthenticated = true;
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
        state.user = null;
        state.permissions = [];
        state.isAuthenticated = false;
        state.topbarCompanies = [];
      })
      .addCase(refreshProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.permissions = action.payload.permissions;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.user = action.payload.user;
        state.permissions = action.payload.permissions;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Falha ao autenticar";
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.permissions = [];
        state.isAuthenticated = false;
        state.selectedCompanyId = null;
        state.topbarCompanies = [];
        state.loading = false;
        state.initialized = true;
      })
      .addCase(loadTopbarCompanies.pending, (state) => {
        state.topbarLoading = true;
      })
      .addCase(loadTopbarCompanies.fulfilled, (state, action) => {
        state.topbarLoading = false;
        state.topbarCompanies = action.payload;
      })
      .addCase(loadTopbarCompanies.rejected, (state) => {
        state.topbarLoading = false;
        state.topbarCompanies = [];
      });
  }
});

export const { setSelectedCompanyId, setAuthFromContext } = authSlice.actions;
export default authSlice.reducer;
