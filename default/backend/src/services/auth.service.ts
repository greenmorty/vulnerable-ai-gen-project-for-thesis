/**
 * Responsibility: Encapsulates JWT signing, refresh-token persistence, rotation, and revocation logic.
 */
import { createHash, randomUUID } from "crypto";

import type { Prisma, PrismaClient, User } from "@prisma/client";
import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshTokenPayload,
} from "../types/auth";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

interface SessionUser {
  id: string;
  email: string;
  role: User["role"];
}

interface RefreshTokenContext {
  userId: string;
  family: string;
  fingerprint: string;
  parentTokenId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface SessionIssueContext {
  user: SessionUser;
  fingerprint: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface RotationContext extends SessionIssueContext {
  currentRecordId: string;
  currentTokenId: string;
  family: string;
}

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const decodeExpirationDate = (token: string): Date => {
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded === "string" || typeof decoded.exp !== "number") {
    throw new AppError("Could not determine token expiration.", 500);
  }

  return new Date(decoded.exp * 1000);
};

const signAccessToken = (user: SessionUser): string => {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      type: "access",
    },
    env.jwtAccessSecret,
    {
      expiresIn: env.jwtAccessExpiresIn as SignOptions["expiresIn"],
      subject: user.id,
    },
  );
};

const signRefreshToken = ({
  userId,
  family,
  fingerprint,
  tokenId,
}: RefreshTokenContext & { tokenId: string }): string => {
  return jwt.sign(
    {
      family,
      fingerprint,
      type: "refresh",
    },
    env.jwtRefreshSecret,
    {
      expiresIn: env.jwtRefreshExpiresIn as SignOptions["expiresIn"],
      jwtid: tokenId,
      subject: userId,
    },
  );
};

const createStoredRefreshToken = async (
  db: DatabaseClient,
  context: RefreshTokenContext,
) => {
  const tokenId = randomUUID();
  const refreshToken = signRefreshToken({
    ...context,
    tokenId,
  });
  const expiresAt = decodeExpirationDate(refreshToken);

  await db.refreshToken.create({
    data: {
      userId: context.userId,
      tokenId,
      family: context.family,
      tokenHash: hashToken(refreshToken),
      deviceFingerprint: context.fingerprint,
      parentTokenId: context.parentTokenId ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      expiresAt,
    },
  });

  return {
    refreshToken,
    tokenId,
    expiresAt,
  };
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);

    if (typeof payload === "string" || payload.type !== "access" || !payload.sub) {
      throw new AppError("Invalid access token.", 401);
    }

    return payload as AccessTokenPayload;
  } catch {
    throw new AppError("Invalid or expired access token.", 401);
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const payload = jwt.verify(token, env.jwtRefreshSecret);

    if (
      typeof payload === "string" ||
      payload.type !== "refresh" ||
      !payload.sub ||
      !payload.jti ||
      !payload.family ||
      !payload.fingerprint
    ) {
      throw new AppError("Invalid refresh token.", 401);
    }

    return payload as RefreshTokenPayload;
  } catch {
    throw new AppError("Invalid or expired refresh token.", 401);
  }
};

export const matchesStoredRefreshToken = (rawToken: string, tokenHash: string): boolean => {
  return hashToken(rawToken) === tokenHash;
};

export const issueSessionTokens = async ({
  user,
  fingerprint,
  ipAddress,
  userAgent,
}: SessionIssueContext) => {
  const family = randomUUID();
  const accessToken = signAccessToken(user);
  const { refreshToken, expiresAt } = await createStoredRefreshToken(prisma, {
    userId: user.id,
    family,
    fingerprint,
    ipAddress,
    userAgent,
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
  };
};

export const rotateSessionTokens = async ({
  user,
  fingerprint,
  ipAddress,
  userAgent,
  currentRecordId,
  currentTokenId,
  family,
}: RotationContext) => {
  return prisma.$transaction(async (tx) => {
    const accessToken = signAccessToken(user);
    const nextToken = await createStoredRefreshToken(tx, {
      userId: user.id,
      family,
      fingerprint,
      parentTokenId: currentTokenId,
      ipAddress,
      userAgent,
    });

    await tx.refreshToken.update({
      where: { id: currentRecordId },
      data: {
        revokedAt: new Date(),
        revokedReason: "rotated",
        replacedByTokenId: nextToken.tokenId,
        lastUsedAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken: nextToken.refreshToken,
      refreshTokenExpiresAt: nextToken.expiresAt,
    };
  });
};

export const revokeRefreshTokenFamily = async (
  family: string,
  reason: string,
  db: DatabaseClient = prisma,
) => {
  await db.refreshToken.updateMany({
    where: {
      family,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
};

export const revokeRefreshTokenById = async (
  tokenId: string,
  reason: string,
  db: DatabaseClient = prisma,
) => {
  await db.refreshToken.updateMany({
    where: {
      tokenId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
      lastUsedAt: new Date(),
    },
  });
};

export const toSessionUser = (
  user: Pick<AuthenticatedUser, "id" | "email" | "role">,
): SessionUser => {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
};

