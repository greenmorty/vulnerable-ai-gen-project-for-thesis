/**
 * Responsibility: Declares checkout and order-management endpoints for order placement and lifecycle tracking.
 */
import { Router } from "express";

import {
  cancelOrder,
  createOrder,
  getOrderById,
  getOrders,
} from "../controllers/orders.controller";
import { requireAuth } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validate-request";
import {
  createOrderBodySchema,
  orderIdParamsSchema,
  orderListQuerySchema,
} from "../schemas/commerce.schemas";
import { asyncHandler } from "../utils/async-handler";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get(
  "/",
  validateRequest({ query: orderListQuerySchema }),
  asyncHandler(getOrders),
);
ordersRouter.post(
  "/",
  validateRequest({ body: createOrderBodySchema }),
  asyncHandler(createOrder),
);
ordersRouter.get(
  "/:id",
  validateRequest({ params: orderIdParamsSchema }),
  asyncHandler(getOrderById),
);
ordersRouter.post(
  "/:id/cancel",
  validateRequest({ params: orderIdParamsSchema }),
  asyncHandler(cancelOrder),
);
