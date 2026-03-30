/**
 * Responsibility: Defines zod validation schemas for public catalog queries and admin product management requests.
 */
import { ProductStatus } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(160).optional(),
);

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid().optional(),
);

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().optional(),
);

const imageUrlSchema = z.string().trim().url();

export const publicProductSortSchema = z.enum([
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "rating_desc",
  "name_asc",
  "name_desc",
]);

const productListQueryBaseSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  categoryId: optionalUuid,
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  minRating: optionalNumber,
  sort: publicProductSortSchema.default("newest"),
  q: optionalTrimmedString,
});

const withProductQueryRefinements = <T extends typeof productListQueryBaseSchema>(schema: T) =>
  schema
    .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: "Minimum price must be less than or equal to maximum price.",
      path: ["minPrice"],
    },
  )
  .refine(
    (value) => value.minRating === undefined || (value.minRating >= 0 && value.minRating <= 5),
    {
      message: "Minimum rating must be between 0 and 5.",
      path: ["minRating"],
    },
  );

export const productListQuerySchema = withProductQueryRefinements(productListQueryBaseSchema);

export const productSearchQuerySchema = withProductQueryRefinements(
  productListQueryBaseSchema.extend({
    q: z.string().trim().min(1).max(120),
    sort: publicProductSortSchema.default("relevance"),
  }),
);

export const productIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createProductBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(10_000),
  shortDescription: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(280).optional(),
  ),
  price: z.coerce.number().positive().max(1_000_000),
  images: z.array(imageUrlSchema).max(20).default([]),
  categoryId: z.string().uuid(),
  sku: z.string().trim().min(1).max(80),
  status: z.nativeEnum(ProductStatus).optional(),
});

export const updateProductBodySchema = createProductBodySchema.extend({
  status: z.nativeEnum(ProductStatus).optional(),
});

export const adminProductListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalTrimmedString,
  categoryId: optionalUuid,
  status: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.nativeEnum(ProductStatus).optional(),
  ),
});
