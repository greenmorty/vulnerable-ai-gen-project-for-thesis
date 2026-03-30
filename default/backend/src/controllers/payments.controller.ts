/**
 * Responsibility: Implements the simulated payment endpoint used during checkout and retry flows.
 */
import type { Request, RequestHandler } from "express";

import { AppError } from "../lib/app-error";
import { simulateOrderPayment } from "../services/commerce.service";

const getAuthenticatedUser = (request: Request) => {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401);
  }

  return request.auth;
};

export const simulatePayment: RequestHandler = async (request, response) => {
  const auth = getAuthenticatedUser(request);
  const result = await simulateOrderPayment(
    auth.id,
    request.body.orderId,
    request.body.paymentMethod,
    auth.role === "ADMIN",
  );

  response.json({
    message:
      result.payment.status === "CAPTURED"
        ? "Payment completed successfully."
        : "Payment failed during simulation.",
    ...result,
  });
};
