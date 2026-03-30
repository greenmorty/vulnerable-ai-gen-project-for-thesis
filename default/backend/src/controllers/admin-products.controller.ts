/**
 * Responsibility: Implements admin product listing, creation, updates, soft deletion, and image upload endpoints.
 */
import { Prisma, ProductStatus } from "@prisma/client";
import type { RequestHandler } from "express";

import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";
import { listAdminProducts } from "../services/catalog.service";

const buildSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-{2,}/g, "-");
};

const generateUniqueProductSlug = async (name: string, excludeId?: string) => {
  const baseSlug = buildSlug(name) || "product";
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        slug: candidate,
        ...(excludeId
          ? {
              id: {
                not: excludeId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (!existingProduct) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const ensureCategoryExists = async (categoryId: string) => {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      id: true,
    },
  });

  if (!category) {
    throw new AppError("Category not found.", 404);
  }
};

const ensureUniqueProductSku = async (sku: string, excludeProductId?: string) => {
  const existingProduct = await prisma.product.findFirst({
    where: {
      sku,
      ...(excludeProductId
        ? {
            id: {
              not: excludeProductId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existingProduct) {
    throw new AppError("A product with that SKU already exists.", 409);
  }
};

const ensureUniqueVariantSku = async (sku: string, excludeProductId?: string) => {
  const existingVariant = await prisma.productVariant.findFirst({
    where: {
      sku,
      ...(excludeProductId
        ? {
            productId: {
              not: excludeProductId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existingVariant) {
    throw new AppError("A product variant with that SKU already exists.", 409);
  }
};

const mapProductResponse = async (productId: string) => {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
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
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return {
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
  };
};

const upsertDefaultVariant = async (
  tx: Prisma.TransactionClient,
  productId: string,
  name: string,
  sku: string,
  price: Prisma.Decimal,
) => {
  const defaultVariant = await tx.productVariant.findFirst({
    where: {
      productId,
      isDefault: true,
    },
    select: {
      id: true,
      inventoryItem: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!defaultVariant) {
    await tx.productVariant.create({
      data: {
        productId,
        name: `${name} Default`,
        sku,
        price,
        isDefault: true,
        isActive: true,
        inventoryItem: {
          create: {
            quantityOnHand: 0,
            reservedQuantity: 0,
          },
        },
      },
    });

    return;
  }

  await tx.productVariant.update({
    where: {
      id: defaultVariant.id,
    },
    data: {
      name: `${name} Default`,
      sku,
      price,
      isActive: true,
      inventoryItem: defaultVariant.inventoryItem
        ? undefined
        : {
            create: {
              quantityOnHand: 0,
              reservedQuantity: 0,
            },
          },
    },
  });
};

export const getAdminProducts: RequestHandler = async (request, response) => {
  const result = await listAdminProducts(request.query as never);

  response.json(result);
};

export const createAdminProduct: RequestHandler = async (request, response) => {
  const { name, description, shortDescription, price, images, categoryId, sku, status } =
    request.body;

  await ensureCategoryExists(categoryId);
  await Promise.all([ensureUniqueProductSku(sku), ensureUniqueVariantSku(sku)]);

  const slug = await generateUniqueProductSlug(name);
  const priceDecimal = new Prisma.Decimal(price);

  const product = await prisma.$transaction(async (tx) => {
    const createdProduct = await tx.product.create({
      data: {
        name,
        slug,
        sku,
        description,
        shortDescription: shortDescription ?? description.slice(0, 240),
        basePrice: priceDecimal,
        status: status ?? ProductStatus.ACTIVE,
        categories: {
          create: [
            {
              categoryId,
            },
          ],
        },
        images: {
          create: images.map((url: string, index: number) => ({
            url,
            position: index,
            isPrimary: index === 0,
          })),
        },
      },
    });

    await upsertDefaultVariant(tx, createdProduct.id, name, sku, priceDecimal);

    return createdProduct;
  });

  response.status(201).json({
    product: await mapProductResponse(product.id),
  });
};

export const updateAdminProduct: RequestHandler = async (request, response) => {
  const { id } = request.params;
  const { name, description, shortDescription, price, images, categoryId, sku, status } = request.body;

  const existingProduct = await prisma.product.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!existingProduct) {
    throw new AppError("Product not found.", 404);
  }

  await ensureCategoryExists(categoryId);
  await Promise.all([
    ensureUniqueProductSku(sku, id),
    ensureUniqueVariantSku(sku, id),
  ]);

  const slug = await generateUniqueProductSlug(name, id);
  const priceDecimal = new Prisma.Decimal(price);

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: {
        id,
      },
      data: {
        name,
        slug,
        sku,
        description,
        shortDescription: shortDescription ?? description.slice(0, 240),
        basePrice: priceDecimal,
        status: status ?? ProductStatus.ACTIVE,
        categories: {
          deleteMany: {},
          create: [
            {
              categoryId,
            },
          ],
        },
        images: {
          deleteMany: {},
          create: images.map((url: string, index: number) => ({
            url,
            position: index,
            isPrimary: index === 0,
          })),
        },
      },
    });

    await upsertDefaultVariant(tx, id, name, sku, priceDecimal);
  });

  response.json({
    product: await mapProductResponse(id),
  });
};

export const softDeleteAdminProduct: RequestHandler = async (request, response) => {
  const { id } = request.params;

  const existingProduct = await prisma.product.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!existingProduct) {
    throw new AppError("Product not found.", 404);
  }

  await prisma.product.update({
    where: {
      id,
    },
    data: {
      status: ProductStatus.ARCHIVED,
    },
  });

  response.status(204).send();
};

export const uploadAdminProductImage: RequestHandler = async (request, response) => {
  const { id } = request.params;
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  if (!request.file) {
    throw new AppError("A product image file is required.", 400);
  }

  response.status(201).json({
    url: `/uploads/products/${request.file.filename}`,
    mimeType: request.file.mimetype,
    size: request.file.size,
  });
};
