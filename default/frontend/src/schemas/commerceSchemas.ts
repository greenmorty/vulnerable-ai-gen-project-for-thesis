/**
 * Responsibility: Defines zod validation schemas and helpers for cart coupons and checkout forms.
 */
import { z, type ZodError } from "zod";

import type { PaymentMethod } from "../types/commerce";

const paymentMethodValues = [
  "CARD",
  "PAYPAL",
  "WALLET",
  "BANK_TRANSFER",
  "CASH_ON_DELIVERY",
] as const;

export interface AddressFormValues {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface CheckoutFormValues {
  shippingAddress: AddressFormValues;
  billingAddress: AddressFormValues;
  billingSameAsShipping: boolean;
  paymentMethod: PaymentMethod;
  notes: string;
}

export const couponFormSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code."),
});

export const addressFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  line1: z.string().trim().min(1, "Address line 1 is required.").max(160),
  line2: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().min(1, "City is required.").max(120),
  state: z.string().trim().max(120).optional().default(""),
  postalCode: z.string().trim().min(1, "Postal code is required.").max(40),
  country: z.string().trim().min(2, "Country is required.").max(120),
  phone: z.string().trim().max(40).optional().default(""),
});

export const checkoutFormSchema = z.object({
  shippingAddress: addressFormSchema,
  billingAddress: addressFormSchema,
  billingSameAsShipping: z.boolean().default(true),
  paymentMethod: z.enum(paymentMethodValues) as z.ZodType<PaymentMethod>,
  notes: z.string().trim().max(1_000).optional().default(""),
});

export const getNestedFieldErrors = (error: ZodError) => {
  return error.issues.reduce<Record<string, string>>((accumulator, issue) => {
    const key = issue.path.join(".");

    if (!accumulator[key]) {
      accumulator[key] = issue.message;
    }

    return accumulator;
  }, {});
};
