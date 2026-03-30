/**
 * Responsibility: Implements public catalog listing, dedicated search, and product detail endpoints.
 */
import type { RequestHandler } from "express";

import {
  getPublicProductDetail,
  listPublicProducts,
} from "../services/catalog.service";

export const listProducts: RequestHandler = async (request, response) => {
  const result = await listPublicProducts(
    request.query as unknown as Parameters<typeof listPublicProducts>[0],
  );

  response.json(result);
};

export const searchProducts: RequestHandler = async (request, response) => {
  const result = await listPublicProducts(
    request.query as unknown as Parameters<typeof listPublicProducts>[0],
  );

  response.json(result);
};

export const getProductById: RequestHandler = async (request, response) => {
  const product = await getPublicProductDetail(request.params.id);

  response.json({
    product,
  });
};
