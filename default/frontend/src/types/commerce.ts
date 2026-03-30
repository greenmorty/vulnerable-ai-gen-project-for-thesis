/**
 * Responsibility: Defines shared cart, checkout, order, payment, and admin-order data contracts for the frontend.
 */
export type CartStatus = "ACTIVE" | "CONVERTED" | "ABANDONED";
export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
export type OrderStatus =
  | "PENDING"
  | "PAYMENT_FAILED"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentMethod =
  | "CARD"
  | "PAYPAL"
  | "WALLET"
  | "BANK_TRANSFER"
  | "CASH_ON_DELIVERY";
export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export interface CommercePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CartCoupon {
  id: string;
  codePreview: string;
  description: string | null;
  type: CouponType;
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  discountAmount: number;
}

export interface CartItem {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inventoryCount: number;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    status: string;
    primaryImageUrl: string | null;
  };
  variant: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

export interface Cart {
  id: string;
  currency: string;
  status: CartStatus;
  totalItems: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
  appliedCoupon: CartCoupon | null;
  items: CartItem[];
}

export interface CartResponse {
  message?: string;
  cart: Cart;
}

export interface OrderAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productId: string | null;
  productSlug: string | null;
  primaryImageUrl: string | null;
  variant: {
    id: string;
    name: string;
    sku: string;
  } | null;
  snapshot: Record<string, unknown> | null;
}

export interface OrderPayment {
  id: string;
  provider: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  providerReference: string | null;
  simulatedOutcome: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderCoupon {
  id: string;
  codePreview: string;
  description: string | null;
  type: CouponType;
  value: number;
  discountAmount: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  currency: string;
  notes: string | null;
  shippingAddress: OrderAddress | null;
  billingAddress: OrderAddress | null;
  placedAt: string | null;
  cancelledAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestPaymentStatus: PaymentStatus | null;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  items: OrderItem[];
  payments: OrderPayment[];
  coupons: OrderCoupon[];
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  currency: string;
  subtotal: number;
  discountTotal: number;
  itemCount: number;
  placedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestPaymentStatus: PaymentStatus | null;
  latestPaymentMethod: PaymentMethod | null;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface OrderListResponse {
  items: OrderListItem[];
  pagination: CommercePagination;
}

export interface OrderResponse {
  message?: string;
  order: Order;
}

export interface PaymentWebhookEvent {
  type: "payment.succeeded" | "payment.failed";
  orderId: string;
  paymentId: string;
  providerReference: string;
  status: PaymentStatus | string;
  amount: number;
  currency: string;
  emittedAt: string;
}

export interface PaymentSimulationResponse {
  message: string;
  payment: OrderPayment;
  order: Order;
  webhookEvent: PaymentWebhookEvent;
}

export interface AdminOrderListResponse {
  items: OrderListItem[];
  pagination: CommercePagination;
}
