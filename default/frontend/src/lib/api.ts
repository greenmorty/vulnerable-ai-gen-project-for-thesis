/**
 * Responsibility: Exposes the shared Axios client and central auth-refresh bridge used across the frontend.
 */
import axios, { AxiosHeaders } from "axios";

import { getDeviceFingerprint } from "../utils/device-fingerprint";

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000/api";

interface AuthHandlers {
  getAccessToken: () => string | null;
  refreshSession: () => Promise<string | null>;
  onAuthFailure: () => void;
}

let authHandlers: AuthHandlers | null = null;
let refreshRequest: Promise<string | null> | null = null;

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const isAuthBoundaryRequest = (url?: string): boolean => {
  return Boolean(
    url &&
      ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some((path) =>
        url.includes(path),
      ),
  );
};

export const registerAuthHandlers = (handlers: AuthHandlers | null) => {
  authHandlers = handlers;
};

apiClient.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers);
  const accessToken = authHandlers?.getAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  headers.set("X-Device-Fingerprint", getDeviceFingerprint());
  config.headers = headers;

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      !authHandlers ||
      !originalRequest ||
      originalRequest.skipAuthRefresh ||
      originalRequest._retry ||
      error.response?.status !== 401 ||
      isAuthBoundaryRequest(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshRequest ??= authHandlers.refreshSession().finally(() => {
        refreshRequest = null;
      });

      const nextAccessToken = await refreshRequest;

      if (!nextAccessToken) {
        authHandlers.onAuthFailure();
        return Promise.reject(error);
      }

      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set("Authorization", `Bearer ${nextAccessToken}`);
      originalRequest.headers = headers;

      return apiClient(originalRequest);
    } catch (refreshError) {
      authHandlers.onAuthFailure();
      return Promise.reject(refreshError);
    }
  },
);
