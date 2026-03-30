/**
 * Responsibility: Defines zod validation schemas for self-service profile changes and admin user management endpoints.
 */
import { UserStatus } from "@prisma/client";
import { z } from "zod";

const optionalAvatarUrlSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().url().nullable().optional(),
);

export const updateProfileBodySchema = z
  .object({
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    email: z
      .string()
      .trim()
      .email()
      .transform((email) => email.toLowerCase())
      .optional(),
    avatarUrl: optionalAvatarUrlSchema,
  })
  .refine(
    (value) =>
      value.firstName !== undefined ||
      value.lastName !== undefined ||
      value.email !== undefined ||
      value.avatarUrl !== undefined,
    {
      message: "At least one profile field must be provided.",
    },
  );

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

