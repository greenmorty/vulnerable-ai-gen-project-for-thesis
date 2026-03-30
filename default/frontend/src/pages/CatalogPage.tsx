/**
 * Responsibility: Implements the storefront catalog page with filters, search, sorting, and pagination.
 */
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { WishlistToggleButton } from "../components/WishlistToggleButton";
import { StarRating } from "../components/catalog/StarRating";
import { apiClient } from "../lib/api";
import type {
  CategoriesResponse,
  CategoryTreeNode,
  ProductListResponse,
} from "../types/catalog";
import { getApiErrorMessage } from "../utils/api-errors";
import { resolveMediaUrl } from "../utils/media";

const renderCategoryBranch = (
  categories: CategoryTreeNode[],
  activeCategoryId: string | null,
  onSelect: (categoryId: string | null) => void,
  depth = 0,
) => {
  return categories.map((category) => (
    <div className="category-branch" key={category.id} style={{ paddingLeft: `${depth * 0.9}rem` }}>
      <button
        className={
          activeCategoryId === category.id
            ? "category-filter-button category-filter-button--active"
            : "category-filter-button"
        }
        onClick={() => onSelect(category.id)}
        type="button"
      >
        {category.name}
      </button>
      {category.children.length > 0
        ? renderCategoryBranch(category.children, activeCategoryId, onSelect, depth + 1)
        : null}
    </div>
  ));
};

export const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [products, setProducts] = useState<ProductListResponse["items"]>([]);
  const [pagination, setPagination] = useState<ProductListResponse["pagination"]>({
    page: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlistError, setWishlistError] = useState("");
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [minPriceInput, setMinPriceInput] = useState(searchParams.get("minPrice") ?? "");
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get("maxPrice") ?? "");
  const deferredSearch = useDeferredValue(searchInput);

  const selectedCategoryId = searchParams.get("categoryId");
  const currentPage = Number(searchParams.get("page") ?? "1") || 1;
  const currentSort = searchParams.get("sort") ?? "newest";
  const currentMinRating = searchParams.get("minRating") ?? "";

  const setParam = (key: string, value?: string | null, resetPage = true) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value && value.trim().length > 0) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    if (resetPage) {
      nextParams.set("page", "1");
    }

    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    const currentQuery = searchParams.get("q") ?? "";
    const currentMinPriceValue = searchParams.get("minPrice") ?? "";
    const currentMaxPriceValue = searchParams.get("maxPrice") ?? "";

    if (currentQuery !== searchInput) {
      setSearchInput(currentQuery);
    }

    if (currentMinPriceValue !== minPriceInput) {
      setMinPriceInput(currentMinPriceValue);
    }

    if (currentMaxPriceValue !== maxPriceInput) {
      setMaxPriceInput(currentMaxPriceValue);
    }
  }, [searchParams]);

  useEffect(() => {
    const activeQuery = searchParams.get("q") ?? "";

    if (deferredSearch !== activeQuery) {
      setParam("q", deferredSearch);
    }
  }, [deferredSearch]);

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const { data } = await apiClient.get<CategoriesResponse>("/categories");

        if (!cancelled) {
          setCategories(data.items);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(getApiErrorMessage(fetchError, "We couldn't load the category tree."));
        }
      }
    };

    void fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const params = Object.fromEntries(searchParams.entries());
        params.page ??= "1";
        params.pageSize ??= "12";

        const { data } = await apiClient.get<ProductListResponse>("/products", {
          params,
        });

        if (!cancelled) {
          setProducts(data.items);
          setPagination(data.pagination);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(getApiErrorMessage(fetchError, "We couldn't load the product catalog."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const totalLabel = useMemo(() => {
    return `${pagination.totalItems} product${pagination.totalItems === 1 ? "" : "s"}`;
  }, [pagination.totalItems]);

  return (
    <PageShell
      eyebrow="Catalog"
      title="Find the right fit for your next order"
      description="Explore the ShopSphere catalog with category filters, full-text search, price bounds, rating thresholds, and multiple sorting modes."
    >
      <div className="catalog-layout">
        <aside className="catalog-sidebar">
          <section className="catalog-panel">
            <h2>Filters</h2>
            <button
              className="button-link"
              onClick={() => setSearchParams(new URLSearchParams())}
              type="button"
            >
              Clear all
            </button>
          </section>

          <section className="catalog-panel">
            <h3>Categories</h3>
            <button
              className={
                !selectedCategoryId
                  ? "category-filter-button category-filter-button--active"
                  : "category-filter-button"
              }
              onClick={() => setParam("categoryId", null)}
              type="button"
            >
              All categories
            </button>
            {renderCategoryBranch(categories, selectedCategoryId, (categoryId) =>
              setParam("categoryId", categoryId),
            )}
          </section>

          <section className="catalog-panel">
            <h3>Price</h3>
            <div className="catalog-filter-grid">
              <label className="form-field">
                <span>Min</span>
                <input
                  className="input"
                  inputMode="decimal"
                  onChange={(event) => setMinPriceInput(event.target.value)}
                  onBlur={(event) => setParam("minPrice", event.target.value)}
                  type="number"
                  value={minPriceInput}
                />
              </label>
              <label className="form-field">
                <span>Max</span>
                <input
                  className="input"
                  inputMode="decimal"
                  onChange={(event) => setMaxPriceInput(event.target.value)}
                  onBlur={(event) => setParam("maxPrice", event.target.value)}
                  type="number"
                  value={maxPriceInput}
                />
              </label>
            </div>
          </section>

          <section className="catalog-panel">
            <h3>Minimum rating</h3>
            <select
              className="input"
              onChange={(event) => setParam("minRating", event.target.value)}
              value={currentMinRating}
            >
              <option value="">Any rating</option>
              <option value="3">3 stars and up</option>
              <option value="4">4 stars and up</option>
              <option value="4.5">4.5 stars and up</option>
            </select>
          </section>
        </aside>

        <section className="catalog-results">
          <div className="catalog-toolbar">
            <label className="form-field catalog-search">
              <span>Search products</span>
              <input
                className="input"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by product name or description"
                type="search"
                value={searchInput}
              />
            </label>

            <label className="form-field catalog-sort">
              <span>Sort</span>
              <select
                className="input"
                onChange={(event) => setParam("sort", event.target.value, false)}
                value={currentSort}
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="rating_desc">Top rated</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="relevance">Relevance</option>
              </select>
            </label>
          </div>

          <div className="catalog-meta">
            <p>{loading ? "Loading catalog..." : totalLabel}</p>
            <p>
              Page {pagination.page} of {pagination.totalPages}
            </p>
          </div>

          {error ? <p className="form-alert">{error}</p> : null}
          {wishlistError ? <p className="form-alert">{wishlistError}</p> : null}

          {loading ? (
            <div className="status-banner">Gathering products from the ShopSphere catalog...</div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <h3>No products matched these filters.</h3>
              <p>Try widening your price range, clearing the category filter, or searching a broader term.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <Link className="product-card__image" to={`/products/${product.id}`}>
                    {resolveMediaUrl(product.primaryImageUrl) ? (
                      <img alt={product.name} src={resolveMediaUrl(product.primaryImageUrl) ?? ""} />
                    ) : (
                      <span>No image</span>
                    )}
                  </Link>
                  <div className="product-card__body">
                    <div className="product-card__categories">
                      {product.categories.map((category) => (
                        <span className="badge" key={category.id}>
                          {category.name}
                        </span>
                      ))}
                    </div>
                    <h3>
                      <Link to={`/products/${product.id}`}>{product.name}</Link>
                    </h3>
                    <p className="product-card__description">
                      {product.shortDescription || "No short description has been added yet."}
                    </p>
                    <StarRating rating={product.averageRating} reviewCount={product.reviewCount} />
                    <div className="product-card__footer">
                      <strong>
                        {product.currency} {product.price.toFixed(2)}
                      </strong>
                      <span>{product.inventoryCount} in stock</span>
                    </div>
                    <div className="table-actions">
                      <Link className="button-link button-link--solid" to={`/products/${product.id}`}>
                        View details
                      </Link>
                      <WishlistToggleButton
                        onError={setWishlistError}
                        productId={product.id}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="pagination-row">
            <button
              className="button-link"
              disabled={pagination.page <= 1}
              onClick={() => setParam("page", String(currentPage - 1), false)}
              type="button"
            >
              Previous
            </button>
            <button
              className="button-link"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setParam("page", String(currentPage + 1), false)}
              type="button"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </PageShell>
  );
};
