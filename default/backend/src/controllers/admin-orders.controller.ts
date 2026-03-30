/**
 * Responsibility: Implements admin order listing filters and CSV export for operational reporting.
 */
import type { RequestHandler } from "express";

import { listAdminOrders } from "../services/commerce.service";

export const getAdminOrders: RequestHandler = async (request, response) => {
  const result = await listAdminOrders(
    request.query as unknown as Parameters<typeof listAdminOrders>[0],
  );

  if ("csv" in result) {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="shopsphere-orders-export.csv"',
    );
    response.send(result.csv);
    return;
  }

  response.json(result);
};
