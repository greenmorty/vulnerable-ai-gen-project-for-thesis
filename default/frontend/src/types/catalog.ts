/**
 * Responsibility: Defines the storefront and admin catalog data contracts consumed by the React frontend.
 */
export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface CategoryTreeNode extends CatalogCategory {
  children: CategoryTreeNode[];
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  position: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  currency: string;
  primaryImageUrl: string | null;
  categories: CatalogCategory[];
  averageRating: number;
  reviewCount: number;
  inventoryCount: number;
}

export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  verifiedPurchase: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  currency: string;
  images: ProductImage[];
  categories: CatalogCategory[];
  averageRating: number;
  reviewCount: number;
  inventoryCount: number;
  reviews: ProductReview[];
}

export interface CatalogPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductListResponse {
  items: ProductSummary[];
  pagination: CatalogPagination;
}

export interface ProductDetailResponse {
  product: ProductDetail;
}

export interface CategoriesResponse {
  items: CategoryTreeNode[];
}

export interface AdminProductRecord {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string | null;
  status: ProductStatus;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
  categories: CatalogCategory[];
  categoryId: string | null;
}

export interface AdminProductListResponse {
  items: AdminProductRecord[];
  pagination: CatalogPagination;
}

export interface AdminProductResponse {
  product: AdminProductRecord;
}

