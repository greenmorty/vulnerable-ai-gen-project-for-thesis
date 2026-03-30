/**
 * Responsibility: Declares product review endpoints for submission, moderation, and storefront retrieval.
 */
import { Router } from "express";

import {
  deleteReview,
  getProductReviews,
  moderateReview,
} from "../controllers/reviews.controller";
import { requireAuth } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import { validateRequest } from "../middleware/validate-request";
import {
  moderateReviewBodySchema,
  productReviewListParamsSchema,
  reviewIdParamsSchema,
} from "../schemas/review.schemas";
import { asyncHandler } from "../utils/async-handler";

export const reviewsRouter = Router();

reviewsRouter.get(
  "/products/:productId",
  validateRequest({ params: productReviewListParamsSchema }),
  asyncHandler(getProductReviews),
);
reviewsRouter.delete(
  "/:id",
  requireAuth,
  validateRequest({ params: reviewIdParamsSchema }),
  asyncHandler(deleteReview),
);
reviewsRouter.patch(
  "/:id/moderate",
  requireAuth,
  requireRole("ADMIN"),
  validateRequest({
    params: reviewIdParamsSchema,
    body: moderateReviewBodySchema,
  }),
  asyncHandler(moderateReview),
);
