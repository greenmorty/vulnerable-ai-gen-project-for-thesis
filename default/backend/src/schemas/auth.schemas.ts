/**
 * Responsibility: Defines zod validation schemas for registration, login, and refresh/logout auth requests.
 */
import { z } from "zod";

const emailSchema = z.string().trim().email().transform((email) => email.toLowerCase());

export const registerBodySchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: emailSchema,
  password: z.string().min(8).max(72),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(72),
});

