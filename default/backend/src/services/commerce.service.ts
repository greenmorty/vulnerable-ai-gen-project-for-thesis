/**
 * Responsibility: Encapsulates cart, coupon, order, payment, and admin order workflows for the ShopSphere commerce domain.
 */
import { randomUUID } from "crypto";

import {
  CartStatus,
  CouponType,
  InventoryMovementType,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  ProductStatus,
  type PrismaClient,
} from "@prisma/client";

import { paymentEventBus, type PaymentWebhookPayload } from "../lib/payment-events";
import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";
import { hashCouponCode, maskCouponCode } from "../utils/coupon-code";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

interface CartMutationInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface OrderAddressInput {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface CreateOrderInput {
  shippingAddress: OrderAddressInput;
  billingAddress?: OrderAddressInput;
  notes?: string;
  paymentMethod?: PaymentMethod;
}

interface OrderListQuery {
  page: number;
  pageSize: number;
}

interface AdminOrderListQuery extends OrderListQuery {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  from?: Date;
  to?: Date;
  export?: "csv";
}

const cartItemInclude = Prisma.validator<Prisma.CartItemInclude>()({
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
          id: true,
          url: true,
          altText: true,
          isPrimary: true,
          position: true,
        },
      },
    },
  },
  variant: {
    select: {
      id: true,
      name: true,
      sku: true,
      inventoryItem: {
        select: {
          id: true,
          trackQuantity: true,
          quantityOnHand: true,
          reservedQuantity: true,
        },
      },
    },
  },
});

const cartInclude = Prisma.validator<Prisma.CartInclude>()({
  appliedCoupon: true,
  items: {
    orderBy: {
      createdAt: "asc",
    },
    include: cartItemInclude,
  },
});

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  items: {
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      sku: true,
      name: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      snapshot: true,
      product: {
        select: {
          id: true,
          slug: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
            select: {
              url: true,
            },
          },
        },
      },
      variant: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
  },
  payments: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      provider: true,
      method: true,
      status: true,
      amount: true,
      currency: true,
      providerReference: true,
      simulatedOutcome: true,
      processedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  coupons: {
    select: {
      id: true,
      code: true,
      discountAmount: true,
      coupon: {
        select: {
          id: true,
          type: true,
          description: true,
          value: true,
        },
      },
    },
  },
});

type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const roundCurrency = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const toDecimal = (value: number): Prisma.Decimal => {
  return new Prisma.Decimal(roundCurrency(value).toFixed(2));
};

const toNumber = (value: Prisma.Decimal | number | string | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value);
};

const getInventoryCount = (
  inventoryItem?:
    | {
        trackQuantity: boolean;
        quantityOnHand: number;
        reservedQuantity: number;
      }
    | null,
): number => {
  if (!inventoryItem) {
    return 0;
  }

  if (!inventoryItem.trackQuantity) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.max(inventoryItem.quantityOnHand - inventoryItem.reservedQuantity, 0);
};

const buildOrderNumber = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SS-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
};

const csvEscape = (value: string | number | null | undefined): string => {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

const toJsonObject = (value: Record<string, unknown>): Prisma.InputJsonValue => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as Prisma.InputJsonValue;
};

const getCouponValidationMessage = (
  coupon: CartRecord["appliedCoupon"] | NonNullable<CartRecord["appliedCoupon"]>,
  subtotal: number,
  now = new Date(),
): string | null => {
  if (!coupon) {
    return null;
  }

  if (!coupon.isActive) {
    return "That coupon is inactive.";
  }

  if (coupon.startsAt.getTime() > now.getTime()) {
    return "That coupon is not active yet.";
  }

  if (coupon.endsAt && coupon.endsAt.getTime() < now.getTime()) {
    return "That coupon has expired.";
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return "That coupon has reached its usage limit.";
  }

  if (coupon.minOrderAmount !== null && subtotal < toNumber(coupon.minOrderAmount)) {
    return `This coupon requires a minimum subtotal of ${toNumber(coupon.minOrderAmount).toFixed(2)}.`;
  }

  return null;
};

const calculateCouponDiscount = (
  coupon: NonNullable<CartRecord["appliedCoupon"]>,
  subtotal: number,
  shippingTotal = 0,
): number => {
  let discount = 0;

  if (coupon.type === CouponType.PERCENTAGE) {
    discount = subtotal * (toNumber(coupon.value) / 100);
  } else if (coupon.type === CouponType.FIXED_AMOUNT) {
    discount = toNumber(coupon.value);
  } else {
    discount = shippingTotal;
  }

  if (coupon.maxDiscountAmount !== null) {
    discount = Math.min(discount, toNumber(coupon.maxDiscountAmount));
  }

  return roundCurrency(Math.max(0, Math.min(discount, subtotal + shippingTotal)));
};

const calculateCartPricing = (cart: CartRecord) => {
  const subtotal = roundCurrency(
    cart.items.reduce((sum, item) => sum + toNumber(item.unitPrice) * item.quantity, 0),
  );
  const shippingTotal = 0;
  const taxTotal = 0;
  const couponValidationMessage = getCouponValidationMessage(cart.appliedCoupon, subtotal);
  const discountTotal =
    cart.appliedCoupon && !couponValidationMessage
      ? calculateCouponDiscount(cart.appliedCoupon, subtotal, shippingTotal)
      : 0;
  const grandTotal = roundCurrency(subtotal - discountTotal + taxTotal + shippingTotal);

  return {
    subtotal,
    discountTotal,
    taxTotal,
    shippingTotal,
    grandTotal,
    couponValidationMessage,
  };
};

const serializeCart = (cart: CartRecord) => {
  const pricing = calculateCartPricing(cart);

  return {
    id: cart.id,
    currency: cart.currency,
    status: cart.status,
    totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: pricing.subtotal,
    discountTotal: pricing.discountTotal,
    taxTotal: pricing.taxTotal,
    shippingTotal: pricing.shippingTotal,
    grandTotal: pricing.grandTotal,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
    appliedCoupon: cart.appliedCoupon
      ? {
          id: cart.appliedCoupon.id,
          codePreview: cart.appliedCoupon.codePreview ?? "Applied coupon",
          description: cart.appliedCoupon.description,
          type: cart.appliedCoupon.type,
          value: toNumber(cart.appliedCoupon.value),
          minOrderAmount:
            cart.appliedCoupon.minOrderAmount !== null
              ? toNumber(cart.appliedCoupon.minOrderAmount)
              : null,
          maxDiscountAmount:
            cart.appliedCoupon.maxDiscountAmount !== null
              ? toNumber(cart.appliedCoupon.maxDiscountAmount)
              : null,
          discountAmount: pricing.discountTotal,
        }
      : null,
    items: cart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      lineTotal: roundCurrency(toNumber(item.unitPrice) * item.quantity),
      inventoryCount: getInventoryCount(item.variant?.inventoryItem),
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        sku: item.product.sku,
        status: item.product.status,
        primaryImageUrl: item.product.images[0]?.url ?? null,
      },
      variant: item.variant
        ? {
            id: item.variant.id,
            name: item.variant.name,
            sku: item.variant.sku,
          }
        : null,
    })),
  };
};

const serializeOrder = (order: OrderRecord) => {
  const latestPayment = order.payments[0] ?? null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: toNumber(order.subtotal),
    discountTotal: toNumber(order.discountTotal),
    taxTotal: toNumber(order.taxTotal),
    shippingTotal: toNumber(order.shippingTotal),
    grandTotal: toNumber(order.grandTotal),
    currency: order.currency,
    notes: order.notes,
    shippingAddress: (order.shippingAddressSnapshot as Record<string, unknown> | null) ?? null,
    billingAddress: (order.billingAddressSnapshot as Record<string, unknown> | null) ?? null,
    placedAt: order.placedAt,
    cancelledAt: order.cancelledAt,
    fulfilledAt: order.fulfilledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: {
      id: order.user.id,
      email: order.user.email,
      firstName: order.user.firstName,
      lastName: order.user.lastName,
    },
    latestPaymentStatus: latestPayment?.status ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      totalPrice: toNumber(item.totalPrice),
      productId: item.product?.id ?? null,
      productSlug: item.product?.slug ?? null,
      primaryImageUrl: item.product?.images[0]?.url ?? null,
      variant: item.variant
        ? {
            id: item.variant.id,
            name: item.variant.name,
            sku: item.variant.sku,
          }
        : null,
      snapshot: item.snapshot,
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      method: payment.method,
      status: payment.status,
      amount: toNumber(payment.amount),
      currency: payment.currency,
      providerReference: payment.providerReference,
      simulatedOutcome: payment.simulatedOutcome,
      processedAt: payment.processedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    })),
    coupons: order.coupons.map((entry) => ({
      id: entry.id,
      codePreview: entry.code,
      description: entry.coupon.description,
      type: entry.coupon.type,
      value: toNumber(entry.coupon.value),
      discountAmount: toNumber(entry.discountAmount),
    })),
  };
};

const serializeOrderListItem = (order: OrderRecord) => {
  const latestPayment = order.payments[0] ?? null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    grandTotal: toNumber(order.grandTotal),
    currency: order.currency,
    subtotal: toNumber(order.subtotal),
    discountTotal: toNumber(order.discountTotal),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    placedAt: order.placedAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    latestPaymentStatus: latestPayment?.status ?? null,
    latestPaymentMethod: latestPayment?.method ?? null,
    customer: {
      id: order.user.id,
      email: order.user.email,
      firstName: order.user.firstName,
      lastName: order.user.lastName,
    },
  };
};

const getOrCreateActiveCartId = async (db: DatabaseClient, userId: string): Promise<string> => {
  const existingCart = await db.cart.findFirst({
    where: {
      userId,
      status: CartStatus.ACTIVE,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
    },
  });

  if (existingCart) {
    return existingCart.id;
  }

  const createdCart = await db.cart.create({
    data: {
      userId,
    },
    select: {
      id: true,
    },
  });

  return createdCart.id;
};

const getCartRecordById = async (db: DatabaseClient, cartId: string): Promise<CartRecord> => {
  const cart = await db.cart.findUnique({
    where: {
      id: cartId,
    },
    include: cartInclude,
  });

  if (!cart) {
    throw new AppError("Cart not found.", 404);
  }

  return cart;
};

const getActiveCartRecord = async (db: DatabaseClient, userId: string): Promise<CartRecord> => {
  const cartId = await getOrCreateActiveCartId(db, userId);
  let cart = await getCartRecordById(db, cartId);
  const pricing = calculateCartPricing(cart);

  if (cart.appliedCoupon && pricing.couponValidationMessage) {
    await db.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        appliedCouponId: null,
      },
    });

    cart = await getCartRecordById(db, cart.id);
  }

  return cart;
};

const ensureMutableOrderStatus = (status: OrderStatus) => {
  if (status !== OrderStatus.PENDING && status !== OrderStatus.PAYMENT_FAILED) {
    throw new AppError("This order can no longer be paid.", 400);
  }
};

const resolveSellableVariant = async (
  db: DatabaseClient,
  productId: string,
  variantId?: string,
) => {
  const product = await db.product.findFirst({
    where: {
      id: productId,
      status: ProductStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      basePrice: true,
      currency: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 1,
        select: {
          url: true,
        },
      },
      variants: {
        where: variantId
          ? {
              id: variantId,
              isActive: true,
            }
          : {
              isActive: true,
            },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          inventoryItem: {
            select: {
              id: true,
              trackQuantity: true,
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

  const variant = product.variants[0] ?? null;

  if (!variant) {
    throw new AppError("No active product variant is available for this product.", 400);
  }

  return {
    product,
    variant,
    unitPrice: toNumber(variant.price ?? product.basePrice),
    inventoryCount: getInventoryCount(variant.inventoryItem),
  };
};

const decrementInventoryAtomically = async (
  db: DatabaseClient,
  inventoryItemId: string,
  quantity: number,
) => {
  const updatedRows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "InventoryItem"
    SET
      "quantityOnHand" = "quantityOnHand" - ${quantity},
      "updatedAt" = NOW()
    WHERE
      "id" = CAST(${inventoryItemId} AS uuid)
      AND ("quantityOnHand" - "reservedQuantity") >= ${quantity}
    RETURNING "id"
  `);

  if (updatedRows.length === 0) {
    throw new AppError("One or more items are no longer available in the requested quantity.", 409);
  }
};

const incrementInventory = async (
  db: DatabaseClient,
  inventoryItemId: string,
  quantity: number,
) => {
  await db.inventoryItem.update({
    where: {
      id: inventoryItemId,
    },
    data: {
      quantityOnHand: {
        increment: quantity,
      },
    },
  });
};

const getOrderRecordForUser = async (
  db: DatabaseClient,
  orderId: string,
  userId: string,
  isAdmin = false,
): Promise<OrderRecord> => {
  const order = await db.order.findFirst({
    where: {
      id: orderId,
      ...(isAdmin ? {} : { userId }),
    },
    include: orderInclude,
  });

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  return order;
};

export const getUserCart = async (userId: string) => {
  const cart = await prisma.$transaction(async (tx) => {
    return getActiveCartRecord(tx, userId);
  });

  return serializeCart(cart);
};

export const addCartItem = async (userId: string, input: CartMutationInput) => {
  const cart = await prisma.$transaction(async (tx) => {
    const activeCart = await getActiveCartRecord(tx, userId);
    const sellableVariant = await resolveSellableVariant(tx, input.productId, input.variantId);
    const existingItem = await tx.cartItem.findFirst({
      where: {
        cartId: activeCart.id,
        productId: input.productId,
        variantId: sellableVariant.variant.id,
      },
      select: {
        id: true,
        quantity: true,
      },
    });

    const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;

    if (nextQuantity > 99) {
      throw new AppError("Cart quantities are limited to 99 units per item.", 400);
    }

    if (sellableVariant.inventoryCount < nextQuantity) {
      throw new AppError("There is not enough inventory available for that quantity.", 409);
    }

    if (existingItem) {
      await tx.cartItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: nextQuantity,
          unitPrice: toDecimal(sellableVariant.unitPrice),
        },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: activeCart.id,
          productId: input.productId,
          variantId: sellableVariant.variant.id,
          quantity: input.quantity,
          unitPrice: toDecimal(sellableVariant.unitPrice),
        },
      });
    }

    return getActiveCartRecord(tx, userId);
  });

  return serializeCart(cart);
};

export const updateCartItemQuantity = async (
  userId: string,
  itemId: string,
  quantity: number,
) => {
  const cart = await prisma.$transaction(async (tx) => {
    const cartItem = await tx.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
          status: CartStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        productId: true,
        variantId: true,
      },
    });

    if (!cartItem) {
      throw new AppError("Cart item not found.", 404);
    }

    const sellableVariant = await resolveSellableVariant(tx, cartItem.productId, cartItem.variantId ?? undefined);

    if (sellableVariant.inventoryCount < quantity) {
      throw new AppError("There is not enough inventory available for that quantity.", 409);
    }

    await tx.cartItem.update({
      where: {
        id: itemId,
      },
      data: {
        quantity,
        unitPrice: toDecimal(sellableVariant.unitPrice),
      },
    });

    return getActiveCartRecord(tx, userId);
  });

  return serializeCart(cart);
};

export const removeCartItem = async (userId: string, itemId: string) => {
  const cart = await prisma.$transaction(async (tx) => {
    const cartItem = await tx.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
          status: CartStatus.ACTIVE,
        },
      },
      select: {
        id: true,
      },
    });

    if (!cartItem) {
      throw new AppError("Cart item not found.", 404);
    }

    await tx.cartItem.delete({
      where: {
        id: itemId,
      },
    });

    return getActiveCartRecord(tx, userId);
  });

  return serializeCart(cart);
};

export const applyCouponToCart = async (userId: string, code: string) => {
  const cart = await prisma.$transaction(async (tx) => {
    const activeCart = await getActiveCartRecord(tx, userId);

    if (activeCart.items.length === 0) {
      throw new AppError("Add at least one item to your cart before applying a coupon.", 400);
    }

    const coupon = await tx.coupon.findUnique({
      where: {
        codeHash: hashCouponCode(code),
      },
    });

    if (!coupon) {
      throw new AppError("Coupon code not found.", 404);
    }

    const subtotal = roundCurrency(
      activeCart.items.reduce((sum, item) => sum + toNumber(item.unitPrice) * item.quantity, 0),
    );
    const validationMessage = getCouponValidationMessage(coupon, subtotal);

    if (validationMessage) {
      throw new AppError(validationMessage, 400);
    }

    await tx.cart.update({
      where: {
        id: activeCart.id,
      },
      data: {
        appliedCouponId: coupon.id,
      },
    });

    return getActiveCartRecord(tx, userId);
  });

  return serializeCart(cart);
};

export const removeCouponFromCart = async (userId: string) => {
  const cart = await prisma.$transaction(async (tx) => {
    const activeCart = await getActiveCartRecord(tx, userId);

    await tx.cart.update({
      where: {
        id: activeCart.id,
      },
      data: {
        appliedCouponId: null,
      },
    });

    return getActiveCartRecord(tx, userId);
  });

  return serializeCart(cart);
};

export const createOrderFromCart = async (userId: string, input: CreateOrderInput) => {
  const order = await prisma.$transaction(async (tx) => {
    const activeCart = await getActiveCartRecord(tx, userId);

    if (activeCart.items.length === 0) {
      throw new AppError("Your cart is empty.", 400);
    }

    const pricing = calculateCartPricing(activeCart);

    if (activeCart.appliedCoupon && pricing.couponValidationMessage) {
      throw new AppError(pricing.couponValidationMessage, 400);
    }

    for (const item of activeCart.items) {
      if (item.product.status !== ProductStatus.ACTIVE) {
        throw new AppError(`"${item.product.name}" is no longer available for checkout.`, 409);
      }

      const inventoryItemId = item.variant?.inventoryItem?.id;

      if (!inventoryItemId) {
        throw new AppError(`"${item.product.name}" cannot be fulfilled right now.`, 409);
      }

      await decrementInventoryAtomically(tx, inventoryItemId, item.quantity);
    }

    const createdOrder = await tx.order.create({
      data: {
        userId,
        orderNumber: buildOrderNumber(),
        status: OrderStatus.PENDING,
        subtotal: toDecimal(pricing.subtotal),
        discountTotal: toDecimal(pricing.discountTotal),
        taxTotal: toDecimal(pricing.taxTotal),
        shippingTotal: toDecimal(pricing.shippingTotal),
        grandTotal: toDecimal(pricing.grandTotal),
        currency: activeCart.currency,
        notes: input.notes,
        shippingAddressSnapshot: toJsonObject(input.shippingAddress),
        billingAddressSnapshot: toJsonObject(input.billingAddress ?? input.shippingAddress),
        placedAt: new Date(),
        items: {
          create: activeCart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            sku: item.variant?.sku ?? item.product.sku,
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: toDecimal(toNumber(item.unitPrice) * item.quantity),
            snapshot: {
              productName: item.product.name,
              productSlug: item.product.slug,
              variantName: item.variant?.name ?? null,
              primaryImageUrl: item.product.images[0]?.url ?? null,
            } as Prisma.InputJsonValue,
          })),
        },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    if (activeCart.appliedCoupon) {
      const refreshedCoupon = await tx.coupon.findUnique({
        where: {
          id: activeCart.appliedCoupon.id,
        },
      });

      if (!refreshedCoupon) {
        throw new AppError("The applied coupon could not be validated.", 400);
      }

      const validationMessage = getCouponValidationMessage(refreshedCoupon, pricing.subtotal);

      if (validationMessage) {
        throw new AppError(validationMessage, 400);
      }

      const discountAmount = calculateCouponDiscount(
        refreshedCoupon,
        pricing.subtotal,
        pricing.shippingTotal,
      );

      await tx.orderCoupon.create({
        data: {
          orderId: createdOrder.id,
          couponId: refreshedCoupon.id,
          code: refreshedCoupon.codePreview ?? maskCouponCode(activeCart.appliedCoupon.codePreview ?? "COUPON"),
          discountAmount: toDecimal(discountAmount),
        },
      });

      await tx.couponRedemption.create({
        data: {
          couponId: refreshedCoupon.id,
          userId,
          orderId: createdOrder.id,
          amountApplied: toDecimal(discountAmount),
        },
      });

      const couponUsageUpdate = await tx.coupon.updateMany({
        where: {
          id: refreshedCoupon.id,
          ...(refreshedCoupon.usageLimit !== null
            ? {
                usageCount: {
                  lt: refreshedCoupon.usageLimit,
                },
              }
            : {}),
        },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });

      if (couponUsageUpdate.count === 0) {
        throw new AppError("That coupon has reached its usage limit.", 409);
      }
    }

    for (const item of activeCart.items) {
      const inventoryItemId = item.variant?.inventoryItem?.id;

      if (!inventoryItemId) {
        continue;
      }

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId,
          actorUserId: userId,
          type: InventoryMovementType.SALE,
          quantity: item.quantity,
          reason: "order_created",
          reference: createdOrder.orderNumber,
        },
      });
    }

    await tx.cartItem.deleteMany({
      where: {
        cartId: activeCart.id,
      },
    });

    await tx.cart.update({
      where: {
        id: activeCart.id,
      },
      data: {
        appliedCouponId: null,
        status: CartStatus.ACTIVE,
      },
    });

    return getOrderRecordForUser(tx, createdOrder.id, userId);
  });

  return serializeOrder(order);
};

export const listUserOrders = async (userId: string, query: OrderListQuery) => {
  const where: Prisma.OrderWhereInput = {
    userId,
  };

  const [orders, totalItems] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: {
        createdAt: "desc",
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.order.count({
      where,
    }),
  ]);

  return {
    items: orders.map(serializeOrderListItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
    },
  };
};

export const getUserOrderDetail = async (userId: string, orderId: string, isAdmin = false) => {
  const order = await getOrderRecordForUser(prisma, orderId, userId, isAdmin);
  return serializeOrder(order);
};

export const cancelUserOrder = async (userId: string, orderId: string, isAdmin = false) => {
  const order = await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findFirst({
      where: {
        id: orderId,
        ...(isAdmin ? {} : { userId }),
      },
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            name: true,
            sku: true,
            variant: {
              select: {
                inventoryItem: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!existingOrder) {
      throw new AppError("Order not found.", 404);
    }

    if (existingOrder.status !== OrderStatus.PENDING) {
      throw new AppError("Only pending orders can be cancelled.", 400);
    }

    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    for (const item of existingOrder.items) {
      const inventoryItemId = item.variant?.inventoryItem?.id;

      if (!inventoryItemId) {
        continue;
      }

      await incrementInventory(tx, inventoryItemId, item.quantity);
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId,
          actorUserId: userId,
          type: InventoryMovementType.RETURN,
          quantity: item.quantity,
          reason: "order_cancelled",
          reference: existingOrder.orderNumber,
        },
      });
    }

    return getOrderRecordForUser(tx, orderId, userId, isAdmin);
  });

  return serializeOrder(order);
};

export const simulateOrderPayment = async (
  userId: string,
  orderId: string,
  paymentMethod: PaymentMethod,
  isAdmin = false,
) => {
  const shouldSucceed = Math.random() < 0.9;
  const providerReference = `SIM-${randomUUID().slice(0, 12).toUpperCase()}`;
  const emittedAt = new Date().toISOString();

  const result = await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findFirst({
      where: {
        id: orderId,
        ...(isAdmin ? {} : { userId }),
      },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
        grandTotal: true,
        currency: true,
      },
    });

    if (!existingOrder) {
      throw new AppError("Order not found.", 404);
    }

    ensureMutableOrderStatus(existingOrder.status);

    const payment = await tx.payment.create({
      data: {
        orderId: existingOrder.id,
        provider: PaymentProvider.SIMULATED,
        method: paymentMethod,
        status: shouldSucceed ? PaymentStatus.CAPTURED : PaymentStatus.FAILED,
        amount: existingOrder.grandTotal,
        currency: existingOrder.currency,
        providerReference,
        simulatedOutcome: shouldSucceed ? "success" : "failure",
        processedAt: new Date(),
      },
      select: {
        id: true,
        provider: true,
        method: true,
        status: true,
        amount: true,
        currency: true,
        providerReference: true,
        simulatedOutcome: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.order.update({
      where: {
        id: existingOrder.id,
      },
      data: {
        status: shouldSucceed ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED,
      },
    });

    const order = await getOrderRecordForUser(tx, existingOrder.id, userId, isAdmin);

    return {
      payment: {
        id: payment.id,
        provider: payment.provider,
        method: payment.method,
        status: payment.status,
        amount: toNumber(payment.amount),
        currency: payment.currency,
        providerReference: payment.providerReference,
        simulatedOutcome: payment.simulatedOutcome,
        processedAt: payment.processedAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
      order: serializeOrder(order),
    };
  });

  const webhookPayload: PaymentWebhookPayload = {
    type: shouldSucceed ? "payment.succeeded" : "payment.failed",
    orderId,
    paymentId: result.payment.id,
    providerReference,
    status: result.payment.status,
    amount: result.payment.amount,
    currency: result.payment.currency,
    emittedAt,
  };

  paymentEventBus.emit("payment.webhook", webhookPayload);

  return {
    ...result,
    webhookEvent: webhookPayload,
  };
};

const buildAdminOrderWhere = (query: AdminOrderListQuery): Prisma.OrderWhereInput => {
  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    query.from || query.to
      ? {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: new Date(query.to.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}),
        }
      : undefined;

  return {
    ...(query.status ? { status: query.status } : {}),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    ...(query.paymentStatus
      ? {
          payments: {
            some: {
              status: query.paymentStatus,
            },
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            {
              orderNumber: {
                contains: query.search,
                mode: "insensitive",
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
};

export const listAdminOrders = async (query: AdminOrderListQuery) => {
  const where = buildAdminOrderWhere(query);
  const take = query.export === "csv" ? undefined : query.pageSize;
  const skip = query.export === "csv" ? undefined : (query.page - 1) * query.pageSize;

  const [orders, totalItems] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take,
    }),
    prisma.order.count({
      where,
    }),
  ]);

  const items = orders.map(serializeOrderListItem);

  if (query.export === "csv") {
    const lines = [
      [
        "orderNumber",
        "status",
        "paymentStatus",
        "paymentMethod",
        "customerEmail",
        "customerName",
        "itemCount",
        "subtotal",
        "discountTotal",
        "grandTotal",
        "currency",
        "placedAt",
        "createdAt",
      ].join(","),
      ...items.map((order) =>
        [
          csvEscape(order.orderNumber),
          csvEscape(order.status),
          csvEscape(order.latestPaymentStatus),
          csvEscape(order.latestPaymentMethod),
          csvEscape(order.customer.email),
          csvEscape(`${order.customer.firstName} ${order.customer.lastName}`.trim()),
          csvEscape(order.itemCount),
          csvEscape(order.subtotal.toFixed(2)),
          csvEscape(order.discountTotal.toFixed(2)),
          csvEscape(order.grandTotal.toFixed(2)),
          csvEscape(order.currency),
          csvEscape(order.placedAt?.toISOString() ?? ""),
          csvEscape(order.createdAt.toISOString()),
        ].join(","),
      ),
    ];

    return {
      csv: `${lines.join("\n")}\n`,
      totalItems,
    };
  }

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
    },
  };
};
