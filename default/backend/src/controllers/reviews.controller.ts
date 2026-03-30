/**
 * Responsibility: Implements review submission, deletion, moderation, and admin review-queue endpoints.
 */
import type { Request, RequestHandler } from "express";

import { AppError } from "../lib/app-error";
import {
  createReviewForProduct,
  deleteReviewById,
  listAdminReviews,
  listApprovedProductReviews,
  moderateReviewById,
} from "../services/reviews.service";

const getAuthenticatedUser = (request: Request) => {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401);
  }

  return request.auth;
};

export const getProductReviews: RequestHandler = async (request, response) => {
  const items = await listApprovedProductReviews(request.params.productId);

  response.json({
    items,
  });
};

export const createProductReview: RequestHandler = async (request, response) => {
  const auth = getAuthenticatedUser(request);
  const review = await createReviewForProduct(auth.id, request.params.id, request.body);

  response.status(201).json({
    message: "Review submitted for moderation.",
    review,
  });
};

export const deleteReview: RequestHandler = async (request, response) => {
  const auth = getAuthenticatedUser(request);
  await deleteReviewById(auth.id, auth.role, request.params.id);

  response.status(204).send();
};

export const moderateReview: RequestHandler = async (request, response) => {
  const review = await moderateReviewById(request.params.id, request.body.status);

  response.json({
    message: `Review ${request.body.status.toLowerCase()} successfully.`,
    review,
  });
};

export const getAdminReviewQueue: RequestHandler = async (request, response) => {
  const result = await listAdminReviews(
    request.query as unknown as Parameters<typeof listAdminReviews>[0],
  );

  response.json(result);
};
