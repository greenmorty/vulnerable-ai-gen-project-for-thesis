/**
 * Responsibility: Provides shared placeholder handlers so scaffolded routes can exist before business logic is built.
 */
import { RequestHandler, Router } from "express";

export const respondNotImplemented = (capability: string): RequestHandler => {
  return (_request, response) => {
    response.status(501).json({
      message: `${capability} is scaffolded but not implemented yet.`,
    });
  };
};

export const createCrudPlaceholderRouter = (resourceName: string): Router => {
  const router = Router();

  router.get("/", respondNotImplemented(`${resourceName} listing`));
  router.get("/:id", respondNotImplemented(`${resourceName} detail retrieval`));
  router.post("/", respondNotImplemented(`${resourceName} creation`));
  router.patch("/:id", respondNotImplemented(`${resourceName} update`));
  router.delete("/:id", respondNotImplemented(`${resourceName} deletion`));

  return router;
};

