/**
 * Responsibility: Defines the API response shapes shared by the frontend auth and profile flows.
 */
import type { AuthUser } from "./auth";

export interface AuthResponse {
  accessToken: string;
  expiresInMinutes: number;
  user: AuthUser;
}

export interface UserResponse {
  message?: string;
  user: AuthUser;
}

export interface ApiErrorResponse {
  message?: string;
  details?: {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
}

