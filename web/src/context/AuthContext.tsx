import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  bootstrapAuth,
  loadTopbarCompanies,
  loginUser,
  logoutUser,
  refreshProfile,
  setSelectedCompanyId
} from "../store/slices/authSlice";
import { AuthUser } from "../types/auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
  permissions: string[];
  selectedCompanyId: string | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  setCompanySelection: (companyId: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useAppDispatch();
  const {
    loading,
    initialized,
    isAuthenticated,
    user,
    permissions,
    selectedCompanyId
  } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!initialized) {
      void dispatch(bootstrapAuth());
    }
  }, [dispatch, initialized]);

  const login = useCallback(
    async (login: string, password: string) => {
      await dispatch(loginUser({ login, password })).unwrap();
      await dispatch(loadTopbarCompanies()).unwrap();
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutUser()).unwrap();
  }, [dispatch]);

  const refreshProfileCallback = useCallback(async () => {
    await dispatch(refreshProfile()).unwrap();
  }, [dispatch]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (user?.isAdmin) {
        return true;
      }

      return permissions.includes(permission);
    },
    [permissions, user?.isAdmin]
  );

  const setCompanySelection = useCallback(
    (companyId: string | null) => {
      dispatch(setSelectedCompanyId(companyId));
    },
    [dispatch]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      loading,
      user,
      permissions,
      selectedCompanyId,
      login,
      logout,
      refreshProfile: refreshProfileCallback,
      hasPermission,
      setCompanySelection
    }),
    [
      isAuthenticated,
      loading,
      user,
      permissions,
      selectedCompanyId,
      login,
      logout,
      refreshProfileCallback,
      hasPermission,
      setCompanySelection
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
