/**
 * Responsibility: Declares inventory and stock movement endpoints for warehouse operations and admin tooling.
 */
import { Router } from "express";

import { respondNotImplemented } from "../utils/create-placeholder-router";

export const inventoryRouter = Router();

inventoryRouter.get("/items", respondNotImplemented("Inventory item listing"));
inventoryRouter.get("/items/:id", respondNotImplemented("Inventory item retrieval"));
inventoryRouter.patch("/items/:id", respondNotImplemented("Inventory item update"));
inventoryRouter.post("/movements", respondNotImplemented("Inventory movement creation"));

