/**
 * Responsibility: Declares simulated payment endpoints for payment intent creation, confirmation, and callbacks.
 */
import { Router } from "express";

import { simulatePayment } from "../controllers/payments.controller";
import { requireAuth } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validate-request";
import { simulatePaymentBodySchema } from "../schemas/commerce.schemas";
import { asyncHandler } from "../utils/async-handler";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);

paymentsRouter.post(
  "/simulate",
  validateRequest({ body: simulatePaymentBodySchema }),
  asyncHandler(simulatePayment),
);
