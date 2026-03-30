/**
 * Responsibility: Declares the authentication endpoints for registration, login, refresh rotation, logout, and session lookup.
 */
import { Router } from "express";

import {
  getSessionUser,
  login,
  logout,
  refresh,
  register,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validate-request";
import { loginBodySchema, registerBodySchema } from "../schemas/auth.schemas";
import { asyncHandler } from "../utils/async-handler";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateRequest({ body: registerBodySchema }),
  asyncHandler(register),
);
authRouter.post("/login", validateRequest({ body: loginBodySchema }), asyncHandler(login));
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(getSessionUser));
