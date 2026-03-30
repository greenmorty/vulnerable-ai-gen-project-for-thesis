/**
 * Responsibility: Defines zod validation schemas and helpers for admin product forms in the frontend.
 */
import { z, type ZodError } from "zod";

import type { ProductStatus } from "../types/catalog";

export interface AdminProductFormValues {
  name: string;
  description: string;
  shortDescription: string;
  price: string;
  sku: string;
  categoryId: string;
  status: ProductStatus;
  imageUrlsText: string;
}

export const adminProductFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required.").max(160),
  description: z.string().trim().min(1, "Description is required.").max(10_000),
  shortDescription: z.string().trim().max(280).optional().default(""),
  price: z
    .string()
    .trim()
    .min(1, "Price is required.")
    .refine((value) => {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) && numericValue > 0;
    }, "Enter a valid positive price."),
  sku: z.string().trim().min(1, "SKU is required.").max(80),
  categoryId: z.string().uuid("Choose a valid category."),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  imageUrlsText: z
    .string()
    .transform((value) =>
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .refine(
      (items) => items.every((item) => /^https?:\/\/|^\/uploads\//.test(item)),
      "Provide valid image URLs.",
    )
    .refine((items) => items.length <= 20, "Use at most 20 images."),
});

export const getAdminProductFieldErrors = (
  error: ZodError,
): Partial<Record<keyof AdminProductFormValues, string>> => {
  const flattened = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(flattened).map(([key, value]) => [key, value?.[0] ?? ""]),
  ) as Partial<Record<keyof AdminProductFormValues, string>>;
};
