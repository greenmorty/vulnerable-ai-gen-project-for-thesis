/**
 * Responsibility: Declares the public category tree endpoint used for storefront navigation and filtering.
 */
import { Router } from "express";

import { getCategoryTree } from "../controllers/categories.controller";
import { asyncHandler } from "../utils/async-handler";

export const categoriesRouter = Router();

categoriesRouter.get("/", asyncHandler(getCategoryTree));
