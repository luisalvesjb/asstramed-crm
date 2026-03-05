const ACCESS_TOKEN_KEY = "asstramed_access_token";
const REFRESH_TOKEN_KEY = "asstramed_refresh_token";
const SELECTED_COMPANY_KEY = "asstramed_selected_company";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAuthStorage(): void {
  clearAccessToken();
  clearRefreshToken();
}

export function getSelectedCompany(): string | null {
  return localStorage.getItem(SELECTED_COMPANY_KEY);
}

export function setSelectedCompany(companyId: string): void {
  localStorage.setItem(SELECTED_COMPANY_KEY, companyId);
}

export function clearSelectedCompany(): void {
  localStorage.removeItem(SELECTED_COMPANY_KEY);
}
