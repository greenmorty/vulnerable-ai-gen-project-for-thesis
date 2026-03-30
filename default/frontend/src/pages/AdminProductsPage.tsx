/**
 * Responsibility: Implements the admin product management table with CRUD modals and optional image uploads.
 */
import { useEffect, useMemo, useState } from "react";

import { Modal } from "../components/Modal";
import { PageShell } from "../components/PageShell";
import { apiClient } from "../lib/api";
import { adminProductFormSchema, getAdminProductFieldErrors } from "../schemas/productSchemas";
import type { AdminProductFormValues } from "../schemas/productSchemas";
import type {
  AdminProductListResponse,
  AdminProductRecord,
  AdminProductResponse,
  CategoriesResponse,
  CategoryTreeNode,
  ProductStatus,
} from "../types/catalog";
import { getApiErrorMessage } from "../utils/api-errors";
import { resolveMediaUrl } from "../utils/media";

const flattenCategories = (items: CategoryTreeNode[], depth = 0): Array<{ id: string; label: string }> => {
  return items.flatMap((item) => [
    {
      id: item.id,
      label: `${"• ".repeat(depth)}${item.name}`,
    },
    ...flattenCategories(item.children, depth + 1),
  ]);
};

const createEmptyFormValues = (): AdminProductFormValues => ({
  name: "",
  description: "",
  shortDescription: "",
  price: "",
  sku: "",
  categoryId: "",
  status: "ACTIVE",
  imageUrlsText: "",
});

export const AdminProductsPage = () => {
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [items, setItems] = useState<AdminProductRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminProductListResponse["pagination"]>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState<AdminProductFormValues>(createEmptyFormValues);
  const [editingProduct, setEditingProduct] = useState<AdminProductRecord | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AdminProductFormValues, string>>
  >({});
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductRecord | null>(null);

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);

  const hydrateFormFromProduct = (product: AdminProductRecord): AdminProductFormValues => ({
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription ?? "",
    price: product.price.toString(),
    sku: product.sku,
    categoryId: product.categoryId ?? "",
    status: product.status,
    imageUrlsText: product.images.map((image) => image.url).join("\n"),
  });

  const closeProductModal = () => {
    setModalMode(null);
    setEditingProduct(null);
    setDraft(createEmptyFormValues());
    setFieldErrors({});
    setModalError("");
    setModalSuccess("");
    setSelectedFiles([]);
  };

  const fetchCategories = async () => {
    const { data } = await apiClient.get<CategoriesResponse>("/categories");
    setCategories(data.items);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get<AdminProductListResponse>("/admin/products", {
        params: {
          page,
          pageSize: pagination.pageSize,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });

      setItems(data.items);
      setPagination(data.pagination);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "We couldn't load admin products."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories().catch((fetchError) => {
      setError(getApiErrorMessage(fetchError, "We couldn't load categories."));
    });
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [page, search, statusFilter]);

  const uploadSelectedFiles = async (productId: string) => {
    if (selectedFiles.length === 0) {
      return [];
    }

    const uploadedUrls: string[] = [];

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("image", file);

      const { data } = await apiClient.post<{ url: string }>(
        `/admin/products/${productId}/images`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      uploadedUrls.push(data.url);
    }

    return uploadedUrls;
  };

  const submitProductForm = async () => {
    const parsed = adminProductFormSchema.safeParse(draft);

    if (!parsed.success) {
      setFieldErrors(getAdminProductFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setModalError("");
    setModalSuccess("");
    setModalSubmitting(true);

    try {
      const payload = {
        name: parsed.data.name,
        description: parsed.data.description,
        shortDescription: parsed.data.shortDescription || undefined,
        price: Number(parsed.data.price),
        sku: parsed.data.sku,
        categoryId: parsed.data.categoryId,
        status: parsed.data.status,
        images: parsed.data.imageUrlsText,
      };

      let product: AdminProductRecord;

      if (modalMode === "create") {
        const { data } = await apiClient.post<AdminProductResponse>("/admin/products", payload);
        product = data.product;
      } else if (editingProduct) {
        const { data } = await apiClient.put<AdminProductResponse>(
          `/admin/products/${editingProduct.id}`,
          payload,
        );
        product = data.product;
      } else {
        setModalSubmitting(false);
        return;
      }

      const uploadedUrls = await uploadSelectedFiles(product.id);

      if (uploadedUrls.length > 0) {
        const mergedImages = [...product.images.map((image) => image.url), ...uploadedUrls];
        const { data } = await apiClient.put<AdminProductResponse>(
          `/admin/products/${product.id}`,
          {
            ...payload,
            images: mergedImages,
          },
        );
        product = data.product;
      }

      setModalSuccess(
        modalMode === "create" ? "Product created successfully." : "Product updated successfully.",
      );
      closeProductModal();
      await fetchProducts();
    } catch (submitError) {
      setModalError(getApiErrorMessage(submitError, "We couldn't save this product."));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await apiClient.delete(`/admin/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchProducts();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "We couldn't archive this product."));
    }
  };

  return (
    <PageShell
      eyebrow="Admin"
      title="Product catalog management"
      description="Create, edit, upload imagery for, and soft-delete products from the ShopSphere back office."
    >
      <div className="admin-toolbar">
        <label className="form-field admin-toolbar__search">
          <span>Search products</span>
          <input
            className="input"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, description, or SKU"
            type="search"
            value={search}
          />
        </label>

        <label className="form-field admin-toolbar__status">
          <span>Status</span>
          <select
            className="input"
            onChange={(event) => {
              setStatusFilter(event.target.value as ProductStatus | "");
              setPage(1);
            }}
            value={statusFilter}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>

        <button
          className="button-link button-link--solid"
          onClick={() => {
            setModalMode("create");
            setDraft(createEmptyFormValues());
            setEditingProduct(null);
          }}
          type="button"
        >
          New product
        </button>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}

      {loading ? (
        <div className="status-banner">Loading product operations data...</div>
      ) : (
        <div className="table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Status</th>
                <th>Price</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-cell">
                        <div className="admin-product-cell__image">
                          {product.images[0] ? (
                            <img
                              alt={product.name}
                              src={resolveMediaUrl(product.images[0].url) ?? ""}
                            />
                          ) : (
                            <span>No image</span>
                          )}
                        </div>
                        <div>
                          <strong>{product.name}</strong>
                          <p className="profile-meta">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td>{product.categories[0]?.name ?? "Unassigned"}</td>
                    <td>
                      <span className="badge">{product.status}</span>
                    </td>
                    <td>
                      {product.currency} {product.price.toFixed(2)}
                    </td>
                    <td>{new Date(product.updatedAt).toLocaleString()}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="button-link"
                          onClick={() => {
                            setModalMode("edit");
                            setEditingProduct(product);
                            setDraft(hydrateFormFromProduct(product));
                            setFieldErrors({});
                            setModalError("");
                            setSelectedFiles([]);
                          }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="button-link"
                          onClick={() => setDeleteTarget(product)}
                          type="button"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="profile-meta" colSpan={6}>
                    No products matched the current admin filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination-row">
            <button
              className="button-link"
              disabled={pagination.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <span className="profile-meta">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              className="button-link"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPage((current) => Math.min(pagination.totalPages, current + 1))
              }
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {modalMode ? (
        <Modal
          description={
            modalMode === "create"
              ? "Create a new product record and optionally upload additional imagery."
              : "Update product details, replace image URLs, or upload new product media."
          }
          footer={
            <>
              <button className="button-link" onClick={closeProductModal} type="button">
                Cancel
              </button>
              <button
                className="button-link button-link--solid"
                disabled={modalSubmitting}
                onClick={() => {
                  void submitProductForm();
                }}
                type="button"
              >
                {modalSubmitting ? "Saving..." : modalMode === "create" ? "Create product" : "Save changes"}
              </button>
            </>
          }
          onClose={closeProductModal}
          title={modalMode === "create" ? "Create product" : "Edit product"}
        >
          <div className="form-grid form-grid--two-up">
            <label className="form-field form-field--full">
              <span>Name</span>
              <input
                className="input"
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                type="text"
                value={draft.name}
              />
              {fieldErrors.name ? <small className="form-error">{fieldErrors.name}</small> : null}
            </label>

            <label className="form-field">
              <span>SKU</span>
              <input
                className="input"
                onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value }))}
                type="text"
                value={draft.sku}
              />
              {fieldErrors.sku ? <small className="form-error">{fieldErrors.sku}</small> : null}
            </label>

            <label className="form-field">
              <span>Price</span>
              <input
                className="input"
                onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
                step="0.01"
                type="number"
                value={draft.price}
              />
              {fieldErrors.price ? <small className="form-error">{fieldErrors.price}</small> : null}
            </label>

            <label className="form-field">
              <span>Category</span>
              <select
                className="input"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, categoryId: event.target.value }))
                }
                value={draft.categoryId}
              >
                <option value="">Select category</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId ? (
                <small className="form-error">{fieldErrors.categoryId}</small>
              ) : null}
            </label>

            <label className="form-field">
              <span>Status</span>
              <select
                className="input"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as ProductStatus,
                  }))
                }
                value={draft.status}
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>

            <label className="form-field form-field--full">
              <span>Short description</span>
              <input
                className="input"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, shortDescription: event.target.value }))
                }
                type="text"
                value={draft.shortDescription}
              />
              {fieldErrors.shortDescription ? (
                <small className="form-error">{fieldErrors.shortDescription}</small>
              ) : null}
            </label>

            <label className="form-field form-field--full">
              <span>Description</span>
              <textarea
                className="input input--textarea"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                rows={6}
                value={draft.description}
              />
              {fieldErrors.description ? (
                <small className="form-error">{fieldErrors.description}</small>
              ) : null}
            </label>

            <label className="form-field form-field--full">
              <span>Image URLs</span>
              <textarea
                className="input input--textarea"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, imageUrlsText: event.target.value }))
                }
                placeholder="One image URL per line"
                rows={5}
                value={draft.imageUrlsText}
              />
              {fieldErrors.imageUrlsText ? (
                <small className="form-error">{fieldErrors.imageUrlsText}</small>
              ) : null}
            </label>

            <label className="form-field form-field--full">
              <span>Upload image files</span>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="input"
                multiple
                onChange={(event) =>
                  setSelectedFiles(Array.from(event.target.files ?? []))
                }
                type="file"
              />
              <small className="profile-meta">
                Selected files: {selectedFiles.length}. Files upload after the product record is saved.
              </small>
            </label>
          </div>

          {modalError ? <p className="form-alert">{modalError}</p> : null}
          {modalSuccess ? <p className="form-success">{modalSuccess}</p> : null}
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal
          footer={
            <>
              <button className="button-link" onClick={() => setDeleteTarget(null)} type="button">
                Cancel
              </button>
              <button
                className="button-link button-link--solid"
                onClick={() => {
                  void handleDeleteProduct();
                }}
                type="button"
              >
                Archive product
              </button>
            </>
          }
          onClose={() => setDeleteTarget(null)}
          title="Archive product"
        >
          <p>
            Archive <strong>{deleteTarget.name}</strong>? The product will disappear from the public catalog but stay available in admin history.
          </p>
        </Modal>
      ) : null}
    </PageShell>
  );
};
