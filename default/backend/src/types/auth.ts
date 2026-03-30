/**
 * Responsibility: Defines backend auth-related TypeScript types for JWT payloads and authenticated requests.
 */
import type { UserRole, UserStatus } from "@prisma/client";
import type { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  jti: string;
  family: string;
  fingerprint: string;
  type: "refresh";
}

