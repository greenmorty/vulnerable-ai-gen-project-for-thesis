/**
 * Responsibility: Defines zod validation schemas and helpers for product review submission forms.
 */
import { z, type ZodError } from "zod";

export interface ReviewFormValues {
  rating: number;
  text: string;
}

export const reviewFormSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a star rating.").max(5),
  text: z.string().trim().min(10, "Write at least 10 characters.").max(1_500),
});

export const getReviewFieldErrors = (error: ZodError<ReviewFormValues>) => {
  const flattened = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(flattened).map(([key, value]) => [key, value?.[0] ?? ""]),
  ) as Partial<Record<keyof ReviewFormValues, string>>;
};
