/**
 * Responsibility: Restricts routes to specific user roles once authentication has succeeded.
 */
import type { UserRole } from "@prisma/client";
import type { RequestHandler } from "express";

import { AppError } from "../lib/app-error";

export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new AppError("Authentication is required.", 401));
      return;
    }

    if (!roles.includes(request.auth.role)) {
      next(new AppError("You do not have permission to access this resource.", 403));
      return;
    }

    next();
  };
};

