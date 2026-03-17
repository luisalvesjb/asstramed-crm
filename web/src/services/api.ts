import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken
} from "../utils/auth-storage";

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "/api";

export const api = axios.create({
  baseURL: apiBaseUrl
});

let refreshPromise: Promise<string | null> | null = null;

function setAuthorizationHeader(config: InternalAxiosRequestConfig, token: string): void {
  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  config.headers = headers;
}

async function requestRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${apiBaseUrl}/auth/refresh`,
      {
        refreshToken
      }
    );

    setAccessToken(response.data.accessToken);
    setRefreshToken(response.data.refreshToken);

    return response.data.accessToken;
  } catch {
    clearAuthStorage();
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    setAuthorizationHeader(config, token);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalConfig || error.response?.status !== 401 || originalConfig._retry) {
      throw error;
    }

    originalConfig._retry = true;

    if (!refreshPromise) {
      refreshPromise = requestRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      throw error;
    }

    setAuthorizationHeader(originalConfig, newAccessToken);
    return api(originalConfig);
  }
);
