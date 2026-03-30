/**
 * Responsibility: Encapsulates dashboard metrics, top-product analytics, and low-stock inventory alerts for admin tooling.
 */
import { OrderStatus, Prisma, ProductStatus } from "@prisma/client";

import { prisma } from "../lib/prisma";

const revenueStatuses = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
] as const;

interface RevenueByDayRow {
  day: Date;
  revenue: number | string | bigint;
}

interface TopProductRow {
  productId: string | null;
  name: string;
  sku: string;
  quantitySold: number | string | bigint;
  revenue: number | string | bigint;
  primaryImageUrl: string | null;
}

interface LowStockRow {
  inventoryItemId: string;
  availableQuantity: number | string | bigint;
  quantityOnHand: number | string | bigint;
  reservedQuantity: number | string | bigint;
  reorderPoint: number | string | bigint;
  warehouseLocation: string | null;
  variantId: string;
  variantName: string;
  sku: string;
  productId: string;
  productName: string;
  productSlug: string;
  primaryImageUrl: string | null;
}

const normalizeNumber = (value: number | string | bigint | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return Number(value);
};

const buildStatusSql = (statuses: readonly OrderStatus[]) => {
  return Prisma.join(statuses.map((status) => Prisma.sql`CAST(${status} AS "OrderStatus")`));
};

export const getAdminStats = async () => {
  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setHours(0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() - 29);

  const [orderAggregate, orderCount, userCount, topProductsRows, revenueRows] = await Promise.all([
    prisma.order.aggregate({
      _sum: {
        grandTotal: true,
      },
      where: {
        status: {
          in: [...revenueStatuses],
        },
      },
    }),
    prisma.order.count(),
    prisma.user.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.$queryRaw<TopProductRow[]>(Prisma.sql`
      SELECT
        oi."productId" AS "productId",
        oi."name" AS "name",
        oi."sku" AS "sku",
        SUM(oi."quantity")::bigint AS "quantitySold",
        SUM(oi."totalPrice")::double precision AS "revenue",
        MAX(product_image."url") AS "primaryImageUrl"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o."id" = oi."orderId"
      LEFT JOIN LATERAL (
        SELECT pi."url"
        FROM "ProductImage" pi
        WHERE pi."productId" = oi."productId"
        ORDER BY pi."isPrimary" DESC, pi."position" ASC
        LIMIT 1
      ) product_image ON true
      WHERE
        o."createdAt" >= ${periodStart}
        AND o."status" IN (${buildStatusSql(revenueStatuses)})
      GROUP BY oi."productId", oi."name", oi."sku"
      ORDER BY "quantitySold" DESC, "revenue" DESC, oi."name" ASC
      LIMIT 5
    `),
    prisma.$queryRaw<RevenueByDayRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('day', o."createdAt") AS "day",
        SUM(o."grandTotal")::double precision AS "revenue"
      FROM "Order" o
      WHERE
        o."createdAt" >= ${periodStart}
        AND o."status" IN (${buildStatusSql(revenueStatuses)})
      GROUP BY DATE_TRUNC('day', o."createdAt")
      ORDER BY "day" ASC
    `),
  ]);

  const revenueByDayMap = new Map(
    revenueRows.map((row) => [
      row.day.toISOString().slice(0, 10),
      normalizeNumber(row.revenue),
    ]),
  );
  const revenueSeries = Array.from({ length: 30 }, (_, offset) => {
    const pointDate = new Date(periodStart);
    pointDate.setDate(periodStart.getDate() + offset);
    const key = pointDate.toISOString().slice(0, 10);

    return {
      date: key,
      revenue: revenueByDayMap.get(key) ?? 0,
    };
  });

  return {
    summary: {
      totalRevenue: normalizeNumber(orderAggregate._sum.grandTotal ?? 0),
      orderCount,
      userCount,
      periodStart,
      periodEnd: today,
    },
    revenueSeries,
    topProducts: topProductsRows.map((row) => ({
      productId: row.productId,
      name: row.name,
      sku: row.sku,
      quantitySold: normalizeNumber(row.quantitySold),
      revenue: normalizeNumber(row.revenue),
      primaryImageUrl: row.primaryImageUrl,
    })),
  };
};

export const getLowStockInventory = async () => {
  const threshold = 10;
  const items = await prisma.$queryRaw<LowStockRow[]>(Prisma.sql`
    SELECT
      ii."id" AS "inventoryItemId",
      GREATEST(ii."quantityOnHand" - ii."reservedQuantity", 0)::bigint AS "availableQuantity",
      ii."quantityOnHand" AS "quantityOnHand",
      ii."reservedQuantity" AS "reservedQuantity",
      ii."reorderPoint" AS "reorderPoint",
      ii."warehouseLocation" AS "warehouseLocation",
      pv."id" AS "variantId",
      pv."name" AS "variantName",
      pv."sku" AS "sku",
      p."id" AS "productId",
      p."name" AS "productName",
      p."slug" AS "productSlug",
      product_image."url" AS "primaryImageUrl"
    FROM "InventoryItem" ii
    INNER JOIN "ProductVariant" pv ON pv."id" = ii."variantId"
    INNER JOIN "Product" p ON p."id" = pv."productId"
    LEFT JOIN LATERAL (
      SELECT pi."url"
      FROM "ProductImage" pi
      WHERE pi."productId" = p."id"
      ORDER BY pi."isPrimary" DESC, pi."position" ASC
      LIMIT 1
    ) product_image ON true
    WHERE
      ii."trackQuantity" = true
      AND GREATEST(ii."quantityOnHand" - ii."reservedQuantity", 0) < ${threshold}
      AND p."status" = CAST(${ProductStatus.ACTIVE} AS "ProductStatus")
      AND pv."isActive" = true
    ORDER BY "availableQuantity" ASC, ii."reorderPoint" ASC, p."name" ASC
    LIMIT 100
  `);

  return {
    threshold,
    items: items.map((item) => ({
      inventoryItemId: item.inventoryItemId,
      availableQuantity: normalizeNumber(item.availableQuantity),
      quantityOnHand: normalizeNumber(item.quantityOnHand),
      reservedQuantity: normalizeNumber(item.reservedQuantity),
      reorderPoint: normalizeNumber(item.reorderPoint),
      warehouseLocation: item.warehouseLocation,
      variant: {
        id: item.variantId,
        name: item.variantName,
        sku: item.sku,
      },
      product: {
        id: item.productId,
        name: item.productName,
        slug: item.productSlug,
        primaryImageUrl: item.primaryImageUrl,
      },
    })),
  };
};
