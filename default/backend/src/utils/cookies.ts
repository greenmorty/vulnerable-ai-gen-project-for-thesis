/**
 * Responsibility: Manages the refresh-token cookie lifecycle for login, rotation, and logout flows.
 */
import type { CookieOptions, Request, Response } from "express";

import { env } from "../config/env";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.nodeEnv === "production",
  path: "/",
};

export const setRefreshTokenCookie = (
  response: Response,
  refreshToken: string,
  expiresAt: Date,
) => {
  response.cookie(env.refreshTokenCookieName, refreshToken, {
    ...baseCookieOptions,
    expires: expiresAt,
  });
};

export const clearRefreshTokenCookie = (response: Response) => {
  response.clearCookie(env.refreshTokenCookieName, baseCookieOptions);
};

export const getRefreshTokenFromRequest = (request: Request): string | null => {
  const token = request.cookies?.[env.refreshTokenCookieName];
  return typeof token === "string" && token.length > 0 ? token : null;
};

