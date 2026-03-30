/**
 * Responsibility: Implements registration, login, refresh rotation, logout, and session lookup endpoints.
 */
import { UserStatus } from "@prisma/client";
import type { RequestHandler } from "express";

import { env } from "../config/env";
import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";
import { publicUserSelect } from "../lib/user-selects";
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "../utils/cookies";
import { getDeviceFingerprint } from "../utils/device-fingerprint";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  issueSessionTokens,
  matchesStoredRefreshToken,
  revokeRefreshTokenById,
  revokeRefreshTokenFamily,
  rotateSessionTokens,
  toSessionUser,
  verifyRefreshToken,
} from "../services/auth.service";

export const register: RequestHandler = async (request, response) => {
  const { firstName, lastName, email, password } = request.body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError("An account with that email already exists.", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
    },
    select: publicUserSelect,
  });

  response.status(201).json({
    message: "Registration successful.",
    user,
  });
};

export const login: RequestHandler = async (request, response) => {
  const { email, password } = request.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.deletedAt || user.status === UserStatus.SUSPENDED) {
    throw new AppError("Invalid email or password.", 401);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password.", 401);
  }

  const fingerprint = getDeviceFingerprint(request);
  const sessionTokens = await issueSessionTokens({
    user: toSessionUser(user),
    fingerprint,
    ipAddress: request.ip,
    userAgent: request.get("user-agent"),
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
    },
  });

  setRefreshTokenCookie(
    response,
    sessionTokens.refreshToken,
    sessionTokens.refreshTokenExpiresAt,
  );

  response.json({
    accessToken: sessionTokens.accessToken,
    expiresInMinutes: env.accessTokenTtlMinutes,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
};

export const refresh: RequestHandler = async (request, response) => {
  const rawRefreshToken = getRefreshTokenFromRequest(request);

  if (!rawRefreshToken) {
    throw new AppError("Refresh token is required.", 401);
  }

  let payload;

  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch (error) {
    clearRefreshTokenCookie(response);
    throw error;
  }

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenId: payload.jti },
    include: {
      user: true,
    },
  });

  const fingerprint = getDeviceFingerprint(request);

  if (
    !tokenRecord ||
    !tokenRecord.user ||
    tokenRecord.user.deletedAt ||
    tokenRecord.user.status === UserStatus.SUSPENDED ||
    tokenRecord.family !== payload.family ||
    tokenRecord.userId !== payload.sub ||
    tokenRecord.deviceFingerprint !== fingerprint ||
    payload.fingerprint !== fingerprint
  ) {
    if (tokenRecord) {
      await revokeRefreshTokenFamily(tokenRecord.family, "invalid_refresh_context");
    }

    clearRefreshTokenCookie(response);
    throw new AppError("Invalid refresh token.", 401);
  }

  if (!matchesStoredRefreshToken(rawRefreshToken, tokenRecord.tokenHash)) {
    await revokeRefreshTokenFamily(tokenRecord.family, "refresh_token_reuse_detected");
    clearRefreshTokenCookie(response);
    throw new AppError("Invalid refresh token.", 401);
  }

  if (
    tokenRecord.revokedAt ||
    tokenRecord.replacedByTokenId ||
    tokenRecord.expiresAt.getTime() <= Date.now()
  ) {
    await revokeRefreshTokenFamily(tokenRecord.family, "refresh_token_reuse_detected");
    clearRefreshTokenCookie(response);
    throw new AppError("Refresh token has expired or already been used.", 401);
  }

  const rotatedSession = await rotateSessionTokens({
    user: toSessionUser(tokenRecord.user),
    fingerprint,
    ipAddress: request.ip,
    userAgent: request.get("user-agent"),
    currentRecordId: tokenRecord.id,
    currentTokenId: tokenRecord.tokenId,
    family: tokenRecord.family,
  });

  setRefreshTokenCookie(
    response,
    rotatedSession.refreshToken,
    rotatedSession.refreshTokenExpiresAt,
  );

  response.json({
    accessToken: rotatedSession.accessToken,
    expiresInMinutes: env.accessTokenTtlMinutes,
    user: {
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
      firstName: tokenRecord.user.firstName,
      lastName: tokenRecord.user.lastName,
      avatarUrl: tokenRecord.user.avatarUrl,
      role: tokenRecord.user.role,
      status: tokenRecord.user.status,
      createdAt: tokenRecord.user.createdAt,
      updatedAt: tokenRecord.user.updatedAt,
    },
  });
};

export const logout: RequestHandler = async (request, response) => {
  const rawRefreshToken = getRefreshTokenFromRequest(request);

  if (rawRefreshToken) {
    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      await revokeRefreshTokenById(payload.jti, "logout");
    } catch {
      // Intentionally swallow token parsing failures so logout remains idempotent.
    }
  }

  clearRefreshTokenCookie(response);
  response.status(204).send();
};

export const getSessionUser: RequestHandler = async (request, response) => {
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
