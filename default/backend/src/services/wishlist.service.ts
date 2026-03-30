/**
 * Responsibility: Encapsulates default-wishlist lookup, listing, and product toggle workflows.
 */
import { Prisma, ProductStatus, ReviewStatus, type PrismaClient } from "@prisma/client";

import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const defaultWishlistName = "Favorites";

const wishlistInclude = Prisma.validator<Prisma.WishlistInclude>()({
  items: {
    orderBy: {
      createdAt: "desc",
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          sku: true,
          basePrice: true,
          currency: true,
          status: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
            select: {
              url: true,
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
            select: {
              rating: true,
            },
          },
        },
      },
    },
  },
});

type WishlistRecord = Prisma.WishlistGetPayload<{ include: typeof wishlistInclude }>;

const serializeWishlist = (wishlist: WishlistRecord) => {
  return {
    id: wishlist.id,
    name: wishlist.name,
    totalItems: wishlist.items.length,
    productIds: wishlist.items.map((item) => item.product.id),
    items: wishlist.items.map((item) => {
      const reviewCount = item.product.reviews.length;
      const averageRating =
        reviewCount > 0
          ? item.product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
          : 0;

      return {
        id: item.id,
        createdAt: item.createdAt,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          shortDescription: item.product.shortDescription,
          sku: item.product.sku,
          price: Number(item.product.basePrice),
          currency: item.product.currency,
          status: item.product.status,
          primaryImageUrl: item.product.images[0]?.url ?? null,
          categories: item.product.categories.map(({ category }) => category),
          averageRating,
          reviewCount,
        },
      };
    }),
  };
};

const getOrCreateDefaultWishlist = async (db: DatabaseClient, userId: string) => {
  const existingWishlist = await db.wishlist.findFirst({
    where: {
      userId,
      isDefault: true,
    },
    select: {
      id: true,
    },
  });

  if (existingWishlist) {
    return existingWishlist.id;
  }

  const createdWishlist = await db.wishlist.create({
    data: {
      userId,
      name: defaultWishlistName,
      isDefault: true,
    },
    select: {
      id: true,
    },
  });

  return createdWishlist.id;
};

const getWishlistRecord = async (db: DatabaseClient, wishlistId: string): Promise<WishlistRecord> => {
  const wishlist = await db.wishlist.findUnique({
    where: {
      id: wishlistId,
    },
    include: wishlistInclude,
  });

  if (!wishlist) {
    throw new AppError("Wishlist not found.", 404);
  }

  return wishlist;
};

export const getUserWishlist = async (userId: string) => {
  const wishlist = await prisma.$transaction(async (tx) => {
    const wishlistId = await getOrCreateDefaultWishlist(tx, userId);
    return getWishlistRecord(tx, wishlistId);
  });

  return serializeWishlist(wishlist);
};

export const addProductToWishlist = async (userId: string, productId: string) => {
  const wishlist = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    const wishlistId = await getOrCreateDefaultWishlist(tx, userId);
    const existingItem = await tx.wishlistItem.findFirst({
      where: {
        wishlistId,
        productId,
      },
      select: {
        id: true,
      },
    });

    if (!existingItem) {
      await tx.wishlistItem.create({
        data: {
          wishlistId,
          productId,
        },
      });
    }

    return getWishlistRecord(tx, wishlistId);
  });

  return serializeWishlist(wishlist);
};

export const removeProductFromWishlist = async (userId: string, productId: string) => {
  const wishlist = await prisma.$transaction(async (tx) => {
    const wishlistId = await getOrCreateDefaultWishlist(tx, userId);
    const existingItem = await tx.wishlistItem.findFirst({
      where: {
        wishlistId,
        productId,
      },
      select: {
        id: true,
      },
    });

    if (existingItem) {
      await tx.wishlistItem.delete({
        where: {
          id: existingItem.id,
        },
      });
    }

    return getWishlistRecord(tx, wishlistId);
  });

  return serializeWishlist(wishlist);
};
