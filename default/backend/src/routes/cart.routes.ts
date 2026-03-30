/**
 * Responsibility: Declares shopping cart endpoints for line items, totals, and coupon application.
 */
import { Router } from "express";

import {
  applyCartCoupon,
  clearCartCoupon,
  createCartItem,
  deleteCartItem,
  getCart,
  patchCartItem,
} from "../controllers/cart.controller";
import { requireAuth } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validate-request";
import {
  applyCouponBodySchema,
  createCartItemBodySchema,
  deleteCartItemBodySchema,
  updateCartItemBodySchema,
  updateCartItemParamsSchema,
} from "../schemas/commerce.schemas";
import { asyncHandler } from "../utils/async-handler";

export const cartRouter = Router();

cartRouter.use(requireAuth);

cartRouter.get("/", asyncHandler(getCart));
cartRouter.post(
  "/",
  validateRequest({ body: createCartItemBodySchema }),
  asyncHandler(createCartItem),
);
cartRouter.delete(
  "/",
  validateRequest({ body: deleteCartItemBodySchema }),
  asyncHandler(deleteCartItem),
);
cartRouter.patch(
  "/items/:itemId",
  validateRequest({
    params: updateCartItemParamsSchema,
    body: updateCartItemBodySchema,
  }),
  asyncHandler(patchCartItem),
);
cartRouter.delete(
  "/items/:itemId",
  validateRequest({
    params: updateCartItemParamsSchema,
  }),
  asyncHandler(deleteCartItem),
);
cartRouter.post(
  "/apply-coupon",
  validateRequest({ body: applyCouponBodySchema }),
  asyncHandler(applyCartCoupon),
);
cartRouter.delete("/coupon", asyncHandler(clearCartCoupon));
