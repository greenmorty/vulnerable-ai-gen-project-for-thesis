/**
 * Responsibility: Declares authenticated self-service profile endpoints for the customer-facing account area.
 */
import { Router } from "express";

import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "../controllers/users.controller";
import { requireAuth } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validate-request";
import { updateProfileBodySchema } from "../schemas/user.schemas";
import { asyncHandler } from "../utils/async-handler";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, asyncHandler(getCurrentUserProfile));
usersRouter.patch(
  "/me",
  requireAuth,
  validateRequest({ body: updateProfileBodySchema }),
  asyncHandler(updateCurrentUserProfile),
);
