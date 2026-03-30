/**
 * Responsibility: Declares coupon validation and administration endpoints for discount campaigns and redemption rules.
 */
import { Router } from "express";

import { respondNotImplemented } from "../utils/create-placeholder-router";

export const couponsRouter = Router();

couponsRouter.get("/", respondNotImplemented("Coupon listing"));
couponsRouter.post("/", respondNotImplemented("Coupon creation"));
couponsRouter.post("/validate", respondNotImplemented("Coupon validation"));
couponsRouter.patch("/:id", respondNotImplemented("Coupon update"));

