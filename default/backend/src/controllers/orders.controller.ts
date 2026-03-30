/**
 * Responsibility: Implements authenticated order creation, listing, detail retrieval, and cancellation endpoints.
 */
import type { Request, RequestHandler } from "express";

import { AppError } from "../lib/app-error";
import {
  cancelUserOrder,
  createOrderFromCart,
  getUserOrderDetail,
  listUserOrders,
} from "../services/commerce.service";

const getAuthenticatedUserId = (request: Request) => {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401);
  }

  return request.auth.id;
};

export const createOrder: RequestHandler = async (request, response) => {
  const order = await createOrderFromCart(getAuthenticatedUserId(request), request.body);

  response.status(201).json({
    message: "Order placed successfully.",
    order,
  });
};

export const getOrders: RequestHandler = async (request, response) => {
  const result = await listUserOrders(
    getAuthenticatedUserId(request),
    request.query as unknown as Parameters<typeof listUserOrders>[1],
  );

  response.json(result);
};

export const getOrderById: RequestHandler = async (request, response) => {
  const authUserId = getAuthenticatedUserId(request);
  const order = await getUserOrderDetail(
    authUserId,
    request.params.id,
    request.auth?.role === "ADMIN",
  );

  response.json({
    order,
  });
};

export const cancelOrder: RequestHandler = async (request, response) => {
  const order = await cancelUserOrder(
    getAuthenticatedUserId(request),
    request.params.id,
    request.auth?.role === "ADMIN",
  );

  response.json({
    message: "Order cancelled successfully.",
    order,
  });
};
