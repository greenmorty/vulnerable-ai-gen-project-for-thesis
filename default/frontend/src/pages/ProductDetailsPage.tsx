/**
 * Responsibility: Implements the product detail page with image gallery, rating summary, reviews, and add-to-cart affordances.
 */
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { WishlistToggleButton } from "../components/WishlistToggleButton";
import { StarRating } from "../components/catalog/StarRating";
import { StarRatingInput } from "../components/catalog/StarRatingInput";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../lib/api";
import { getReviewFieldErrors, reviewFormSchema } from "../schemas/reviewSchemas";
import type { ProductDetail, ProductDetailResponse } from "../types/catalog";
import type { CartResponse } from "../types/commerce";
import { getApiErrorMessage } from "../utils/api-errors";
import { resolveMediaUrl } from "../utils/media";

export const ProductDetailsPage = () => {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const { id } = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartNotice, setCartNotice] = useState("");
  const [wishlistError, setWishlistError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviewValues, setReviewValues] = useState({
    rating: 5,
    text: "",
  });
  const [reviewFieldErrors, setReviewFieldErrors] = useState<
    Partial<Record<"rating" | "text", string>>
  >({});
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchProduct = async () => {
      if (!id) {
        setError("This product route is missing its identifier.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const { data } = await apiClient.get<ProductDetailResponse>(`/products/${id}`);

        if (!cancelled) {
          setProduct(data.product);
          setSelectedImageIndex(0);
          setQuantity(1);
          setReviewSuccess("");
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(getApiErrorMessage(fetchError, "We couldn't load this product."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const activeImage = useMemo(() => {
    if (!product) {
      return null;
    }

    return product.images[selectedImageIndex] ?? product.images[0] ?? null;
  }, [product, selectedImageIndex]);

  const addToCart = async () => {
    if (!product) {
      return;
    }

    if (status !== "authenticated") {
      navigate("/login", {
        replace: false,
      });
      return;
    }

    setAddingToCart(true);
    setCartNotice("");

    try {
      const { data } = await apiClient.post<CartResponse>("/cart", {
        productId: product.id,
        quantity,
      });

      const totalItems = data.cart.totalItems;
      setCartNotice(
        `${product.name} was added to your cart. You now have ${totalItems} item${totalItems === 1 ? "" : "s"} ready for checkout.`,
      );
    } catch (addError) {
      setCartNotice(getApiErrorMessage(addError, "We couldn't add this item to your cart."));
    } finally {
      setAddingToCart(false);
    }
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!product) {
      return;
    }

    if (status !== "authenticated") {
      navigate("/login", {
        state: {
          from: `/products/${product.id}`,
        },
      });
      return;
    }

    setReviewError("");
    setReviewSuccess("");

    const parsed = reviewFormSchema.safeParse(reviewValues);

    if (!parsed.success) {
      setReviewFieldErrors(getReviewFieldErrors(parsed.error));
      return;
    }

    setReviewFieldErrors({});
    setSubmittingReview(true);

    try {
      await apiClient.post(`/products/${product.id}/reviews`, parsed.data);
      setReviewFieldErrors({});
      setReviewValues({
        rating: 5,
        text: "",
      });
      setReviewSuccess("Your review was submitted and is now waiting for moderation.");
    } catch (submitError) {
      setReviewError(getApiErrorMessage(submitError, "We couldn't submit your review."));
    } finally {
      setSubmittingReview(false);
    }
  };

  const existingApprovedReview = user
    ? product?.reviews.find((review) => review.user.id === user.id) ?? null
    : null;
  const hasSubmittedReview = Boolean(existingApprovedReview || reviewSuccess);

  return (
    <PageShell
      eyebrow="Product"
      title={product?.name ?? "Product detail"}
      description={
        product?.shortDescription ??
        "Browse product media, check inventory, review customer feedback, and move into cart actions."
      }
    >
      {loading ? (
        <div className="status-banner">Loading this product from the ShopSphere catalog...</div>
      ) : error ? (
        <p className="form-alert">{error}</p>
      ) : product ? (
        <div className="product-detail-layout">
          {wishlistError ? <p className="form-alert">{wishlistError}</p> : null}
          <section className="gallery-panel">
            <div className="gallery-stage">
              {activeImage ? (
                <img
                  alt={activeImage.altText || product.name}
                  src={resolveMediaUrl(activeImage.url) ?? ""}
                />
              ) : (
                <div className="gallery-placeholder">No product image available</div>
              )}
            </div>
            {product.images.length > 1 ? (
              <div className="gallery-thumbs">
                {product.images.map((image, index) => (
                  <button
                    className={
                      index === selectedImageIndex
                        ? "gallery-thumb gallery-thumb--active"
                        : "gallery-thumb"
                    }
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    type="button"
                  >
                    <img
                      alt={image.altText || `${product.name} thumbnail`}
                      src={resolveMediaUrl(image.url) ?? ""}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="product-detail-panel">
            <div className="product-card__categories">
              {product.categories.map((category) => (
                <span className="badge" key={category.id}>
                  {category.name}
                </span>
              ))}
            </div>
            <h2>{product.name}</h2>
            <StarRating rating={product.averageRating} reviewCount={product.reviewCount} />
            <p className="product-price">
              {product.currency} {product.price.toFixed(2)}
            </p>
            <p>{product.description || "No long-form product description has been added yet."}</p>
            <div className="detail-meta-grid">
              <article className="info-card">
                <p>Inventory available: {product.inventoryCount}</p>
              </article>
              <article className="info-card">
                <p>Approved reviews: {product.reviewCount}</p>
              </article>
            </div>
            <div className="detail-actions">
              <label className="form-field detail-quantity">
                <span>Quantity</span>
                <input
                  className="input"
                  inputMode="numeric"
                  max={Math.max(1, product.inventoryCount)}
                  min={1}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setQuantity(
                      Number.isFinite(nextValue)
                        ? Math.min(Math.max(nextValue, 1), Math.max(product.inventoryCount, 1))
                        : 1,
                    );
                  }}
                  type="number"
                  value={quantity}
                />
              </label>
              <button
                className="button-link button-link--solid"
                disabled={product.inventoryCount <= 0 || addingToCart}
                onClick={() => {
                  void addToCart();
                }}
                type="button"
              >
                {product.inventoryCount > 0
                  ? addingToCart
                    ? "Adding..."
                    : "Add to cart"
                  : "Out of stock"}
              </button>
              <Link className="button-link" to="/cart">
                View cart
              </Link>
              <WishlistToggleButton onError={setWishlistError} productId={product.id} />
              {cartNotice ? <span className="profile-meta">{cartNotice}</span> : null}
            </div>
          </section>

          <section className="reviews-panel">
            <h3>Customer reviews</h3>
            <div className="review-form-card">
              {status === "authenticated" ? (
                hasSubmittedReview ? (
                  <div className="empty-state">
                    <p>
                      {existingApprovedReview
                        ? "You already have an approved review on this product. You can remove it later from the reviews API if needed."
                        : reviewSuccess}
                    </p>
                  </div>
                ) : (
                  <form className="form-grid" onSubmit={handleReviewSubmit}>
                    <label className="form-field">
                      <span>Your rating</span>
                      <StarRatingInput
                        onChange={(nextRating) =>
                          setReviewValues((current) => ({
                            ...current,
                            rating: nextRating,
                          }))
                        }
                        value={reviewValues.rating}
                      />
                      {reviewFieldErrors.rating ? (
                        <small className="form-error">{reviewFieldErrors.rating}</small>
                      ) : null}
                    </label>

                    <label className="form-field">
                      <span>Your review</span>
                      <textarea
                        className="input input--textarea"
                        onChange={(event) =>
                          setReviewValues((current) => ({
                            ...current,
                            text: event.target.value,
                          }))
                        }
                        rows={5}
                        value={reviewValues.text}
                      />
                      {reviewFieldErrors.text ? (
                        <small className="form-error">{reviewFieldErrors.text}</small>
                      ) : null}
                    </label>

                    {reviewError ? <p className="form-alert">{reviewError}</p> : null}
                    <div className="inline-actions">
                      <button
                        className="button-link button-link--solid"
                        disabled={submittingReview}
                        type="submit"
                      >
                        {submittingReview ? "Submitting..." : "Submit review"}
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <div className="empty-state">
                  <p>Sign in to save this product or submit a review.</p>
                  <div className="inline-actions">
                    <Link className="button-link button-link--solid" to="/login">
                      Login
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {product.reviews.length === 0 ? (
              <div className="empty-state">
                <p>No approved reviews are published for this product yet.</p>
              </div>
            ) : (
              <div className="review-list">
                {product.reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <div className="review-card__header">
                      <div>
                        <strong>
                          {review.user.firstName} {review.user.lastName}
                        </strong>
                        <p className="profile-meta">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StarRating rating={review.rating} />
                    </div>
                    {review.title ? <h4>{review.title}</h4> : null}
                    {review.body ? <p>{review.body}</p> : null}
                    {review.verifiedPurchase ? <span className="badge">Verified purchase</span> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </PageShell>
  );
};
