/**
 * Responsibility: Normalizes, hashes, and masks coupon codes for secure lookup and display.
 */
import { createHash } from "crypto";

export const normalizeCouponCode = (value: string): string => {
  return value.trim().toUpperCase();
};

export const hashCouponCode = (value: string): string => {
  return createHash("sha256").update(normalizeCouponCode(value)).digest("hex");
};

export const maskCouponCode = (value: string): string => {
  const normalized = normalizeCouponCode(value);

  if (normalized.length <= 4) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}${"•".repeat(Math.max(normalized.length - 4, 2))}`;
};
