/**
 * Responsibility: Verifies access JWTs, loads the current user, and attaches the authenticated identity to the request.
 */
import { UserStatus } from "@prisma/client";
import type { RequestHandler } from "express";

import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";
import { publicUserSelect } from "../lib/user-selects";
import { verifyAccessToken } from "../services/auth.service";

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const token = getBearerToken(request.header("authorization"));

    if (!token) {
      throw new AppError("Authentication is required.", 401);
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        ...publicUserSelect,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt || user.status === UserStatus.SUSPENDED) {
      throw new AppError("Your session is no longer valid.", 401);
    }

    request.auth = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};

