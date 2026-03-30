/**
 * Responsibility: Implements admin dashboard statistics and low-stock inventory alert endpoints.
 */
import type { RequestHandler } from "express";

import { getAdminStats, getLowStockInventory } from "../services/admin.service";

export const getDashboardStats: RequestHandler = async (_request, response) => {
  const stats = await getAdminStats();

  response.json(stats);
};

export const getInventoryAlerts: RequestHandler = async (_request, response) => {
  const inventory = await getLowStockInventory();

  response.json(inventory);
};
