/**
 * Responsibility: Logs request and response metadata for local debugging and operational visibility.
 */
import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const userId = request.auth?.id ?? "anonymous";

    console.info(
      [
        new Date().toISOString(),
        request.method,
        request.originalUrl,
        response.statusCode,
        `${durationMs.toFixed(1)}ms`,
        `user=${userId}`,
      ].join(" "),
    );
  });

  next();
};

