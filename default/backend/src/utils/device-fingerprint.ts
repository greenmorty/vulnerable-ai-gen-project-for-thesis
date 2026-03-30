/**
 * Responsibility: Derives a stable device fingerprint value for refresh-token storage and rotation checks.
 */
import { createHash } from "crypto";
import type { Request } from "express";

const hashValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export const getDeviceFingerprint = (request: Request): string => {
  const explicitFingerprint = request.header("x-device-fingerprint");

  if (explicitFingerprint) {
    return hashValue(explicitFingerprint.trim());
  }

  const userAgent = request.get("user-agent") ?? "unknown-user-agent";
  const acceptLanguage = request.get("accept-language") ?? "unknown-language";
  const ipAddress = request.ip ?? "unknown-ip";

  return hashValue(`${userAgent}::${acceptLanguage}::${ipAddress}`);
};

