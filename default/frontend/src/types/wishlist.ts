/**
 * Responsibility: Defines the default-wishlist response shapes shared by wishlist pages, cards, and toggle controls.
 */
import type { CatalogCategory } from "./catalog";

export interface WishlistProductSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  sku: string;
  price: number;
  currency: string;
  status: string;
  primaryImageUrl: string | null;
  categories: CatalogCategory[];
  averageRating: number;
  reviewCount: number;
}

export interface WishlistItem {
  id: string;
  createdAt: string;
  product: WishlistProductSummary;
}

export interface Wishlist {
  id: string;
  name: string;
  totalItems: number;
  productIds: string[];
  items: WishlistItem[];
}

export interface WishlistResponse {
  message?: string;
  wishlist: Wishlist;
}
