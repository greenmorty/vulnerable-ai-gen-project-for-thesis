/**
 * Responsibility: Implements the public category tree endpoint for storefront navigation and filtering.
 */
import type { RequestHandler } from "express";

import { listCategoryTree } from "../services/catalog.service";

export const getCategoryTree: RequestHandler = async (_request, response) => {
  const items = await listCategoryTree();

  response.json({
    items,
  });
};

