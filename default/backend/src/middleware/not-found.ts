/**
 * Responsibility: Returns a consistent JSON response when no API route matches the incoming request.
 */
import { RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
};

