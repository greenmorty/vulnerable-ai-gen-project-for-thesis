/**
 * Responsibility: Implements public catalog queries, full-text search, product detail aggregation, and admin product listing.
 */
import { Prisma, ProductStatus, ReviewStatus } from "@prisma/client";

import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";

interface ProductListQuery {
  page: number;
  pageSize: number;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort:
    | "relevance"
    | "newest"
    | "price_asc"
    | "price_desc"
    | "rating_desc"
    | "name_asc"
    | "name_desc";
  q?: string;
}

interface AdminProductListQuery {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
}

interface ProductCatalogRow {
  id: string;
  averageRating: number | null;
  reviewCount: bigint | number;
  inventoryCount: bigint | number;
  relevance: number | null;
}

const normalizeNumber = (value: number | bigint | string | null | undefined): number => {
  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value ?? 0;
};

const searchVectorExpression = Prisma.sql`
  to_tsvector(
    'simple',
    coalesce(p."name", '') || ' ' || coalesce(p."shortDescription", '') || ' ' || coalesce(p."description", '')
  )
`;

const buildPublicCatalogClauses = (query: ProductListQuery) => {
  const whereClauses: Prisma.Sql[] = [
    Prisma.sql`p."status" = CAST(${ProductStatus.ACTIVE} AS "ProductStatus")`,
  ];

  if (query.categoryId) {
    whereClauses.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "ProductCategory" pc
        WHERE pc."productId" = p."id"
          AND pc."categoryId" = CAST(${query.categoryId} AS uuid)
      )
    `);
  }

  if (query.minPrice !== undefined) {
    whereClauses.push(Prisma.sql`p."basePrice" >= ${new Prisma.Decimal(query.minPrice)}`);
  }

  if (query.maxPrice !== undefined) {
    whereClauses.push(Prisma.sql`p."basePrice" <= ${new Prisma.Decimal(query.maxPrice)}`);
  }

  if (query.minRating !== undefined) {
    whereClauses.push(
      Prisma.sql`COALESCE(review_stats."averageRating", 0) >= ${query.minRating}`,
    );
  }

  if (query.q) {
    whereClauses.push(
      Prisma.sql`${searchVectorExpression} @@ websearch_to_tsquery('simple', ${query.q})`,
    );
  }

  return whereClauses;
};

const buildPublicProductRowsQuery = (query: ProductListQuery) => {
  const whereClauses = buildPublicCatalogClauses(query);
  const whereSql =
    whereClauses.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereClauses, Prisma.sql` AND `)}`
      : Prisma.empty;
  const relevanceSql = query.q
    ? Prisma.sql`ts_rank_cd(${searchVectorExpression}, websearch_to_tsquery('simple', ${query.q}))`
    : Prisma.sql`0::double precision`;

  const orderByFragments: Record<ProductListQuery["sort"], Prisma.Sql> = {
    relevance: query.q
      ? Prisma.sql`"relevance" DESC, p."createdAt" DESC`
      : Prisma.sql`p."createdAt" DESC`,
    newest: Prisma.sql`p."createdAt" DESC`,
    price_asc: Prisma.sql`p."basePrice" ASC, p."createdAt" DESC`,
    price_desc: Prisma.sql`p."basePrice" DESC, p."createdAt" DESC`,
    rating_desc: Prisma.sql`
      COALESCE(review_stats."averageRating", 0) DESC,
      COALESCE(review_stats."reviewCount", 0) DESC,
      p."createdAt" DESC
    `,
    name_asc: Prisma.sql`p."name" ASC`,
    name_desc: Prisma.sql`p."name" DESC`,
  };

  const rowsQuery = Prisma.sql`
    SELECT
      p."id",
      COALESCE(review_stats."averageRating", 0) AS "averageRating",
      COALESCE(review_stats."reviewCount", 0) AS "reviewCount",
      COALESCE(inventory_stats."inventoryCount", 0) AS "inventoryCount",
      ${relevanceSql} AS "relevance"
    FROM "Product" p
    LEFT JOIN LATERAL (
      SELECT
        AVG(r."rating")::double precision AS "averageRating",
        COUNT(*)::bigint AS "reviewCount"
      FROM "Review" r
      WHERE r."productId" = p."id"
        AND r."status" = CAST(${ReviewStatus.APPROVED} AS "ReviewStatus")
    ) review_stats ON true
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(GREATEST(COALESCE(ii."quantityOnHand", 0) - COALESCE(ii."reservedQuantity", 0), 0)), 0)::bigint AS "inventoryCount"
      FROM "ProductVariant" pv
      LEFT JOIN "InventoryItem" ii ON ii."variantId" = pv."id"
      WHERE pv."productId" = p."id"
        AND pv."isActive" = true
    ) inventory_stats ON true
    ${whereSql}
    ORDER BY ${orderByFragments[query.sort]}
    LIMIT ${query.pageSize}
    OFFSET ${(query.page - 1) * query.pageSize}
  `;

  const countQuery = Prisma.sql`
    SELECT COUNT(*)::bigint AS "count"
    FROM (
      SELECT p."id"
      FROM "Product" p
      LEFT JOIN LATERAL (
        SELECT AVG(r."rating")::double precision AS "averageRating"
        FROM "Review" r
        WHERE r."productId" = p."id"
          AND r."status" = CAST(${ReviewStatus.APPROVED} AS "ReviewStatus")
      ) review_stats ON true
      ${whereSql}
    ) filtered_products
  `;

  return {
    rowsQuery,
    countQuery,
  };
};

export const listPublicProducts = async (query: ProductListQuery) => {
  const { rowsQuery, countQuery } = buildPublicProductRowsQuery(query);
  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<ProductCatalogRow[]>(rowsQuery),
    prisma.$queryRaw<Array<{ count: bigint | number }>>(countQuery),
  ]);

  if (rows.length === 0) {
    return {
      items: [],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: normalizeNumber(countRows[0]?.count),
        totalPages: Math.max(1, Math.ceil(normalizeNumber(countRows[0]?.count) / query.pageSize)),
      },
    };
  }

  const productIds = rows.map((row) => row.id);
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      basePrice: true,
      currency: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        select: {
          id: true,
          url: true,
          altText: true,
          isPrimary: true,
          position: true,
        },
      },
      categories: {
        select: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  const productsById = new Map(products.map((product) => [product.id, product]));
  const totalItems = normalizeNumber(countRows[0]?.count);

  return {
    items: rows
      .map((row) => {
        const product = productsById.get(row.id);

        if (!product) {
          return null;
        }

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          price: Number(product.basePrice),
          currency: product.currency,
          primaryImageUrl: product.images[0]?.url ?? null,
          categories: product.categories.map(({ category }) => category),
          averageRating: normalizeNumber(row.averageRating),
          reviewCount: normalizeNumber(row.reviewCount),
          inventoryCount: normalizeNumber(row.inventoryCount),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
    },
  };
};

export const getPublicProductDetail = async (id: string) => {
  const product = await prisma.product.findFirst({
    where: {
      id,
      status: ProductStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      basePrice: true,
      currency: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        select: {
          id: true,
          url: true,
          altText: true,
          isPrimary: true,
          position: true,
        },
      },
      categories: {
        select: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      reviews: {
        where: {
          status: ReviewStatus.APPROVED,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          createdAt: true,
          verifiedPurchase: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
      variants: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          inventoryItem: {
            select: {
              quantityOnHand: true,
              reservedQuantity: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const reviewCount = product.reviews.length;
  const averageRating =
    reviewCount > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : 0;
  const inventoryCount = product.variants.reduce((sum, variant) => {
    const inventoryItem = variant.inventoryItem;

    if (!inventoryItem) {
      return sum;
    }

    return sum + Math.max(inventoryItem.quantityOnHand - inventoryItem.reservedQuantity, 0);
  }, 0);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    price: Number(product.basePrice),
    currency: product.currency,
    images: product.images,
    categories: product.categories.map(({ category }) => category),
    averageRating,
    reviewCount,
    inventoryCount,
    reviews: product.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      createdAt: review.createdAt,
      verifiedPurchase: review.verifiedPurchase,
      user: review.user,
    })),
  };
};

export const listAdminProducts = async (query: AdminProductListQuery) => {
  const where: Prisma.ProductWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.categoryId
      ? {
          categories: {
            some: {
              categoryId: query.categoryId,
            },
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              sku: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [products, totalItems] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        shortDescription: true,
        status: true,
        basePrice: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          select: {
            id: true,
            url: true,
            altText: true,
            isPrimary: true,
            position: true,
          },
        },
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      shortDescription: product.shortDescription,
      status: product.status,
      price: Number(product.basePrice),
      currency: product.currency,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      images: product.images,
      categories: product.categories.map(({ category }) => category),
      categoryId: product.categories[0]?.category.id ?? null,
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
    },
  };
};

export const listCategoryTree = async () => {
  const categories = await prisma.category.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parentId: true,
    },
  });

  const byParentId = new Map<string | null, typeof categories>();

  for (const category of categories) {
    const bucket = byParentId.get(category.parentId ?? null) ?? [];
    bucket.push(category);
    byParentId.set(category.parentId ?? null, bucket);
  }

  const buildTree = (parentId: string | null) => {
    const children = byParentId.get(parentId) ?? [];

    return children.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      children: buildTree(category.id),
    }));
  };

  return buildTree(null);
};
