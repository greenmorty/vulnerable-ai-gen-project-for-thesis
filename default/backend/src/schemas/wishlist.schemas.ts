/**
 * Responsibility: Defines zod validation schemas for default wishlist add/remove requests.
 */
import { z } from "zod";

export const wishlistProductBodySchema = z.object({
  productId: z.string().uuid(),
});
