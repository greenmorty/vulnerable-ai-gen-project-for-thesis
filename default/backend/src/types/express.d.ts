/**
 * Responsibility: Extends Express request typing so authenticated user data can flow through middleware safely.
 */
import type { AuthenticatedUser } from "./auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

export {};

