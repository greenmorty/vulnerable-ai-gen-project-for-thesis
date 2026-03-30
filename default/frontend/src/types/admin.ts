/**
 * Responsibility: Defines admin dashboard, low-stock, and review-moderation data contracts for the frontend.
 */
import type { CommercePagination } from "./commerce";

export interface AdminDashboardStatsResponse {
  summary: {
    totalRevenue: number;
    orderCount: number;
    userCount: number;
    periodStart: string;
    periodEnd: string;
  };
  revenueSeries: Array<{
    date: string;
    revenue: number;
  }>;
  topProducts: Array<{
    productId: string | null;
    name: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    primaryImageUrl: string | null;
  }>;
}

export interface AdminInventoryResponse {
  threshold: number;
  items: Array<{
    inventoryItemId: string;
    availableQuantity: number;
    quantityOnHand: number;
    reservedQuantity: number;
    reorderPoint: number;
    warehouseLocation: string | null;
    variant: {
      id: string;
      name: string;
      sku: string;
    };
    product: {
      id: string;
      name: string;
      slug: string;
      primaryImageUrl: string | null;
    };
  }>;
}

export type ModerationReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminReviewRecord {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: ModerationReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    status: string;
    primaryImageUrl: string | null;
  };
}

export interface AdminReviewsResponse {
  items: AdminReviewRecord[];
  pagination: CommercePagination;
}
