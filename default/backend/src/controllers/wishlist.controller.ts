/**
 * Responsibility: Implements authenticated default-wishlist listing and product add/remove endpoints.
 */
import type { Request, RequestHandler } from "express";

import { AppError } from "../lib/app-error";
import {
  addProductToWishlist,
  getUserWishlist,
  removeProductFromWishlist,
} from "../services/wishlist.service";

const getAuthenticatedUserId = (request: Request) => {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401);
  }

  return request.auth.id;
};

export const getWishlist: RequestHandler = async (request, response) => {
  const wishlist = await getUserWishlist(getAuthenticatedUserId(request));

  response.json({
    wishlist,
  });
};

export const addWishlistProduct: RequestHandler = async (request, response) => {
  const wishlist = await addProductToWishlist(
    getAuthenticatedUserId(request),
    request.body.productId,
  );

  response.status(201).json({
    message: "Product saved to your wishlist.",
    wishlist,
  });
};

export const deleteWishlistProduct: RequestHandler = async (request, response) => {
  const wishlist = await removeProductFromWishlist(
    getAuthenticatedUserId(request),
    request.body.productId,
  );

  response.json({
    message: "Product removed from your wishlist.",
    wishlist,
  });
};
