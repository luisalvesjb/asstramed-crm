import { RootState } from "../index";

export const selectAuthState = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectPermissions = (state: RootState) => state.auth.permissions;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthInitialized = (state: RootState) => state.auth.initialized;

export const selectHasPermission = (permission: string) => (state: RootState) => {
  if (state.auth.user?.isAdmin) {
    return true;
  }

  return state.auth.permissions.includes(permission);
};
