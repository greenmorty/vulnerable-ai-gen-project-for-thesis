/**
 * Responsibility: Implements authenticated profile lookup and self-service profile updates.
 */
import type { RequestHandler } from "express";

import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";
import { publicUserSelect } from "../lib/user-selects";

export const getCurrentUserProfile: RequestHandler = async (request, response) => {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: request.auth.id },
    select: publicUserSelect,
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  response.json({
    user,
  });
};

export const updateCurrentUserProfile: RequestHandler = async (request, response) => {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401);
  }

  const { firstName, lastName, email, avatarUrl } = request.body;

  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: {
          not: request.auth.id,
        },
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new AppError("Another account already uses that email address.", 409);
    }
  }

  const user = await prisma.user.update({
    where: { id: request.auth.id },
    data: {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
    select: publicUserSelect,
  });

  response.json({
    message: "Profile updated successfully.",
    user,
  });
};

