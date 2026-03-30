/**
 * Responsibility: Implements authenticated cart retrieval, line-item mutations, and coupon application endpoints.
 */
import type { Request, RequestHandler } from "express";

import { AppError } from "../lib/app-error";
import {
  addCartItem,
  applyCouponToCart,
  getUserCart,
  removeCartItem,
  removeCouponFromCart,
  updateCartItemQuantity,
} from "../services/commerce.service";

const getAuthenticatedUserId = (request: Request) => {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401);
  }

  return request.auth.id;
};

export const getCart: RequestHandler = async (request, response) => {
  const cart = await getUserCart(getAuthenticatedUserId(request));

  response.json({
    cart,
  });
};

export const createCartItem: RequestHandler = async (request, response) => {
  const cart = await addCartItem(getAuthenticatedUserId(request), request.body);

  response.status(201).json({
    message: "Cart updated successfully.",
    cart,
  });
};

export const patchCartItem: RequestHandler = async (request, response) => {
  const cart = await updateCartItemQuantity(
    getAuthenticatedUserId(request),
    request.params.itemId,
    request.body.quantity,
  );

  response.json({
    message: "Cart updated successfully.",
    cart,
  });
};

export const deleteCartItem: RequestHandler = async (request, response) => {
  const itemId = "itemId" in request.params && request.params.itemId
    ? request.params.itemId
    : request.body.itemId;
  const cart = await removeCartItem(getAuthenticatedUserId(request), itemId);

  response.json({
    message: "Item removed from cart.",
    cart,
  });
};

export const applyCartCoupon: RequestHandler = async (request, response) => {
  const cart = await applyCouponToCart(getAuthenticatedUserId(request), request.body.code);

  response.json({
    message: "Coupon applied successfully.",
    cart,
  });
};

export const clearCartCoupon: RequestHandler = async (request, response) => {
  const cart = await removeCouponFromCart(getAuthenticatedUserId(request));

  response.json({
    message: "Coupon removed successfully.",
    cart,
  });
};
