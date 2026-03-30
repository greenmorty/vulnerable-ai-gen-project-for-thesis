/**
 * Responsibility: Defines zod validation schemas for cart, checkout, payment simulation, and admin order endpoints.
 */
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid().optional(),
);

const optionalDate = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? value : parsedDate;
}, z.date().optional());

export const createCartItemBodySchema = z.object({
  productId: z.string().uuid(),
  variantId: optionalUuid,
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const updateCartItemParamsSchema = z.object({
  itemId: z.string().uuid(),
});

export const updateCartItemBodySchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
});

export const deleteCartItemBodySchema = z.object({
  itemId: z.string().uuid(),
});

export const applyCouponBodySchema = z.object({
  code: z.string().trim().min(1).max(80),
});

export const addressSnapshotSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(160),
  line2: optionalTrimmedString,
  city: z.string().trim().min(1).max(120),
  state: optionalTrimmedString,
  postalCode: z.string().trim().min(1).max(40),
  country: z.string().trim().min(2).max(120),
  phone: optionalTrimmedString,
});

export const createOrderBodySchema = z.object({
  shippingAddress: addressSnapshotSchema,
  billingAddress: addressSnapshotSchema.optional(),
  notes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(1_000).optional(),
  ),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.CARD),
});

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const orderIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const simulatePaymentBodySchema = z.object({
  orderId: z.string().uuid(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.CARD),
});

export const adminOrderListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: optionalTrimmedString,
    status: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.nativeEnum(OrderStatus).optional(),
    ),
    paymentStatus: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.nativeEnum(PaymentStatus).optional(),
    ),
    from: optionalDate,
    to: optionalDate,
    export: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.enum(["csv"]).optional(),
    ),
  })
  .refine(
    (value) => value.from === undefined || value.to === undefined || value.from <= value.to,
    {
      message: "The start date must be before the end date.",
      path: ["from"],
    },
  );
