/**
 * Responsibility: Encapsulates product review submission, moderation, listing, and deletion workflows.
 */
import { OrderStatus, Prisma, ProductStatus, ReviewStatus, UserRole } from "@prisma/client";

import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";

interface ReviewInput {
  rating: number;
  text: string;
}

interface AdminReviewListQuery {
  page: number;
  pageSize: number;
  status?: ReviewStatus;
  search?: string;
}

const paidLikeStatuses = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.REFUNDED,
] as const;

const reviewInclude = Prisma.validator<Prisma.ReviewInclude>()({
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  },
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      status: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 1,
        select: {
          url: true,
        },
      },
    },
  },
});

type ReviewRecord = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

const serializeReview = (review: ReviewRecord) => {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    verifiedPurchase: review.verifiedPurchase,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user: {
      id: review.user.id,
      email: review.user.email,
      firstName: review.user.firstName,
      lastName: review.user.lastName,
      avatarUrl: review.user.avatarUrl,
    },
    product: {
      id: review.product.id,
      name: review.product.name,
      slug: review.product.slug,
      sku: review.product.sku,
      status: review.product.status,
      primaryImageUrl: review.product.images[0]?.url ?? null,
    },
  };
};

export const createReviewForProduct = async (
  userId: string,
  productId: string,
  input: ReviewInput,
) => {
  const review = await prisma.$transaction(async (tx) => {
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

    const existingReview = await tx.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingReview) {
      throw new AppError("You have already reviewed this product.", 409);
    }

    const verifiedPurchaseCount = await tx.orderItem.count({
      where: {
        productId,
        order: {
          userId,
          status: {
            in: [...paidLikeStatuses],
          },
        },
      },
    });

    const createdReview = await tx.review.create({
      data: {
        userId,
        productId,
        rating: input.rating,
        body: input.text,
        status: ReviewStatus.PENDING,
        verifiedPurchase: verifiedPurchaseCount > 0,
      },
      include: reviewInclude,
    });

    return createdReview;
  });

  return serializeReview(review);
};

export const deleteReviewById = async (userId: string, role: UserRole, reviewId: string) => {
  await prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({
      where: {
        id: reviewId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!review) {
      throw new AppError("Review not found.", 404);
    }

    if (role !== UserRole.ADMIN && review.userId !== userId) {
      throw new AppError("You do not have permission to delete this review.", 403);
    }

    await tx.review.delete({
      where: {
        id: reviewId,
      },
    });
  });
};

export const moderateReviewById = async (reviewId: string, status: ReviewStatus) => {
  const existingReview = await prisma.review.findUnique({
    where: {
      id: reviewId,
    },
    select: {
      id: true,
    },
  });

  if (!existingReview) {
    throw new AppError("Review not found.", 404);
  }

  const review = await prisma.review.update({
    where: {
      id: reviewId,
    },
    data: {
      status,
    },
    include: reviewInclude,
  });

  return serializeReview(review);
};

export const listAdminReviews = async (query: AdminReviewListQuery) => {
  const where: Prisma.ReviewWhereInput = {
    ...(query.status ? { status: query.status } : { status: ReviewStatus.PENDING }),
    ...(query.search
      ? {
          OR: [
            {
              body: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              product: {
                name: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
            {
              user: {
                email: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
            {
              user: {
                firstName: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
            {
              user: {
                lastName: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };

  const [reviews, totalItems] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      include: reviewInclude,
      orderBy: {
        createdAt: "desc",
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.review.count({
      where,
    }),
  ]);

  return {
    items: reviews.map(serializeReview),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
    },
  };
};

export const listApprovedProductReviews = async (productId: string) => {
  const reviews = await prisma.review.findMany({
    where: {
      productId,
      status: ReviewStatus.APPROVED,
    },
    include: reviewInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return reviews.map(serializeReview);
};
