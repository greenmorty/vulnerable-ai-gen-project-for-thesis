/**
 * Responsibility: Applies zod validation to request bodies, params, and query strings before route handlers run.
 */
import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validateRequest = ({
  body,
  params,
  query,
}: ValidationSchemas): RequestHandler => {
  return (request, _response, next) => {
    try {
      if (body) {
        request.body = body.parse(request.body);
      }

      if (params) {
        request.params = params.parse(request.params);
      }

      if (query) {
        request.query = query.parse(request.query);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
