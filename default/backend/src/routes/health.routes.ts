/**
 * Responsibility: Exposes a lightweight health endpoint for local checks and deployment probes.
 */
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json({
    service: "ShopSphere API",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

