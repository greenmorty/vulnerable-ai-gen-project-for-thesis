/**
 * Responsibility: Defines zod validation schemas for product review submission, moderation, and admin review queries.
 */
import { ReviewStatus } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(160).optional(),
);

export const productReviewParamsSchema = z.object({
  id: z.string().uuid(),
});

export const productReviewListParamsSchema = z.object({
  productId: z.string().uuid(),
});

export const reviewIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createReviewBodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(10).max(1_500),
});

export const moderateReviewBodySchema = z.object({
  status: z.enum([ReviewStatus.APPROVED, ReviewStatus.REJECTED]),
});

export const adminReviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.nativeEnum(ReviewStatus).optional(),
  ),
  search: optionalTrimmedString,
});
