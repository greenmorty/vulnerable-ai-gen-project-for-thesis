/**
 * Responsibility: Defines the shared authentication and authorization types used across the frontend.
 */
export type UserRole = "CUSTOMER" | "ADMIN" | "SUPPORT";
export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export type AuthStatus = "loading" | "guest" | "authenticated";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string | null;
}

