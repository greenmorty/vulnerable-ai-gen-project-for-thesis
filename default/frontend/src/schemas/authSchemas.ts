/**
 * Responsibility: Defines zod validation schemas and helpers for auth and profile forms in the React app.
 */
import { z, type ZodError } from "zod";

export const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const registerFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").max(60),
    lastName: z.string().trim().min(1, "Last name is required.").max(60),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(72),
    confirmPassword: z.string().min(8, "Please confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const profileFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
  email: z.string().trim().email("Enter a valid email address."),
  avatarUrl: z
    .union([z.string().trim().url("Enter a valid avatar URL."), z.literal("")])
    .default(""),
});

export const getFieldErrors = <T extends Record<string, unknown>>(error: ZodError<T>) => {
  const flattened = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(flattened).map(([key, value]) => [key, value?.[0] ?? ""]),
  ) as Partial<Record<keyof T, string>>;
};

