/**
 * Responsibility: Declares wishlist endpoints for personal saved-item collections and sharing workflows.
 */
import { Router } from "express";

import {
  addWishlistProduct,
  deleteWishlistProduct,
  getWishlist,
} from "../controllers/wishlist.controller";
import { requireAuth } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validate-request";
import { wishlistProductBodySchema } from "../schemas/wishlist.schemas";
import { asyncHandler } from "../utils/async-handler";

export const wishlistsRouter = Router();

wishlistsRouter.use(requireAuth);

wishlistsRouter.get("/", asyncHandler(getWishlist));
wishlistsRouter.post(
  "/",
  validateRequest({ body: wishlistProductBodySchema }),
  asyncHandler(addWishlistProduct),
);
wishlistsRouter.delete(
  "/",
  validateRequest({ body: wishlistProductBodySchema }),
  asyncHandler(deleteWishlistProduct),
);
