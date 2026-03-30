/**
 * Responsibility: Declares the public product catalog endpoints for listing, search, and detail retrieval.
 */
import { Router } from "express";

import {
  getProductById,
  listProducts,
  searchProducts,
} from "../controllers/products.controller";
import { createProductReview } from "../controllers/reviews.controller";
import { requireAuth } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validate-request";
import {
  productIdParamsSchema,
  productListQuerySchema,
  productSearchQuerySchema,
} from "../schemas/product.schemas";
import { createReviewBodySchema } from "../schemas/review.schemas";
import { asyncHandler } from "../utils/async-handler";

export const productsRouter = Router();

productsRouter.get(
  "/search",
  validateRequest({ query: productSearchQuerySchema }),
  asyncHandler(searchProducts),
);
productsRouter.get("/", validateRequest({ query: productListQuerySchema }), asyncHandler(listProducts));
productsRouter.post(
  "/:id/reviews",
  requireAuth,
  validateRequest({
    params: productIdParamsSchema,
    body: createReviewBodySchema,
  }),
  asyncHandler(createProductReview),
);
productsRouter.get(
  "/:id",
  validateRequest({ params: productIdParamsSchema }),
  asyncHandler(getProductById),
);
