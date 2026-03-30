/**
 * Responsibility: Converts uncaught route and middleware errors into a consistent JSON API response.
 */
import { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";

import { env } from "../config/env";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Validation failed.",
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Image upload exceeds the 5MB size limit."
        : error.message;

    response.status(400).json({
      message,
    });
    return;
  }

  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : 500;

  const message =
    error instanceof Error ? error.message : "An unexpected server error occurred.";

  response.status(statusCode).json({
    message,
    ...(typeof error === "object" && error !== null && "details" in error
      ? { details: error.details }
      : {}),
    ...(env.nodeEnv !== "production" && error instanceof Error
      ? { stack: error.stack }
      : {}),
  });
};
