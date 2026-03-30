/**
 * Responsibility: Implements the customer cart page with quantity controls, coupon application, and checkout handoff.
 */
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../lib/api";
import { couponFormSchema } from "../schemas/commerceSchemas";
import type { Cart, CartResponse } from "../types/commerce";
import { getApiErrorMessage } from "../utils/api-errors";
import { resolveMediaUrl } from "../utils/media";

const formatMoney = (currency: string, amount: number) => `${currency} ${amount.toFixed(2)}`;

export const CartPage = () => {
  const { status } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const fetchCart = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get<CartResponse>("/cart");
      setCart(data.cart);
      setCouponCode("");
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "We couldn't load your cart."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      void fetchCart();
      return;
    }

    if (status === "guest") {
      setCart(null);
      setLoading(false);
    }
  }, [status]);

  const updateQuantity = async (itemId: string, quantity: number) => {
    setActiveItemId(itemId);
    setError("");

    try {
      if (quantity <= 0) {
        const { data } = await apiClient.delete<CartResponse>("/cart", {
          data: {
            itemId,
          },
        });

        setCart(data.cart);
        return;
      }

      const { data } = await apiClient.patch<CartResponse>(`/cart/items/${itemId}`, {
        quantity,
      });

      setCart(data.cart);
    } catch (updateError) {
      setError(getApiErrorMessage(updateError, "We couldn't update that cart item."));
    } finally {
      setActiveItemId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    await updateQuantity(itemId, 0);
  };

  const applyCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCouponError("");

    const parsed = couponFormSchema.safeParse({
      code: couponCode,
    });

    if (!parsed.success) {
      setCouponError(parsed.error.issues[0]?.message ?? "Enter a valid coupon code.");
      return;
    }

    setIsApplyingCoupon(true);

    try {
      const { data } = await apiClient.post<CartResponse>("/cart/apply-coupon", parsed.data);
      setCart(data.cart);
      setCouponCode("");
    } catch (applyError) {
      setCouponError(getApiErrorMessage(applyError, "We couldn't apply that coupon."));
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = async () => {
    setIsApplyingCoupon(true);
    setCouponError("");

    try {
      const { data } = await apiClient.delete<CartResponse>("/cart/coupon");
      setCart(data.cart);
    } catch (removeError) {
      setCouponError(getApiErrorMessage(removeError, "We couldn't remove that coupon."));
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <PageShell
        eyebrow="Cart"
        title="Your cart"
        description="Review the items you've collected for checkout."
      >
        <div className="status-banner">Loading your ShopSphere cart...</div>
      </PageShell>
    );
  }

  if (status === "guest") {
    return (
      <PageShell
        eyebrow="Cart"
        title="Sign in to use your server-side cart"
        description="ShopSphere stores carts per account, so you'll need to log in before adding products, applying coupons, or starting checkout."
      >
        <div className="empty-state">
          <p>Your cart follows your account across sessions once you're signed in.</p>
          <div className="inline-actions">
            <Link className="button-link button-link--solid" to="/login">
              Login
            </Link>
            <Link className="button-link" to="/register">
              Create account
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Cart"
      title="Your ShopSphere cart"
      description="Adjust quantities, apply discounts, and move into checkout once everything looks right."
    >
      {error ? <p className="form-alert">{error}</p> : null}

      {!cart || cart.items.length === 0 ? (
        <div className="empty-state">
          <h3>Your cart is empty.</h3>
          <p>Browse the product catalog to start building your next order.</p>
          <div className="inline-actions">
            <Link className="button-link button-link--solid" to="/products">
              Browse products
            </Link>
          </div>
        </div>
      ) : (
        <div className="commerce-layout">
          <section className="commerce-panel commerce-panel--list">
            {cart.items.map((item) => (
              <article className="cart-item-card" key={item.id}>
                <Link className="cart-item-card__image" to={`/products/${item.product.id}`}>
                  {resolveMediaUrl(item.product.primaryImageUrl) ? (
                    <img
                      alt={item.product.name}
                      src={resolveMediaUrl(item.product.primaryImageUrl) ?? ""}
                    />
                  ) : (
                    <span>No image</span>
                  )}
                </Link>

                <div className="cart-item-card__content">
                  <div>
                    <h3>
                      <Link to={`/products/${item.product.id}`}>{item.product.name}</Link>
                    </h3>
                    <p className="profile-meta">
                      {item.variant?.name ? `${item.variant.name} • ` : ""}
                      SKU {item.variant?.sku ?? item.product.sku}
                    </p>
                    <p className="profile-meta">{item.inventoryCount} available</p>
                  </div>

                  <div className="cart-item-card__footer">
                    <div className="quantity-stepper" aria-label={`Quantity controls for ${item.product.name}`}>
                      <button
                        className="button-link"
                        disabled={activeItemId === item.id}
                        onClick={() => {
                          void updateQuantity(item.id, item.quantity - 1);
                        }}
                        type="button"
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        className="button-link"
                        disabled={
                          activeItemId === item.id || item.quantity >= Math.max(item.inventoryCount, item.quantity)
                        }
                        onClick={() => {
                          void updateQuantity(item.id, item.quantity + 1);
                        }}
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    <strong>{formatMoney(cart.currency, item.lineTotal)}</strong>
                  </div>

                  <div className="table-actions">
                    <button
                      className="button-link"
                      disabled={activeItemId === item.id}
                      onClick={() => {
                        void removeItem(item.id);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="commerce-sidebar">
            <section className="commerce-panel">
              <h2>Coupon</h2>
              {cart.appliedCoupon ? (
                <div className="coupon-summary">
                  <div>
                    <strong>{cart.appliedCoupon.codePreview}</strong>
                    <p className="profile-meta">
                      {cart.appliedCoupon.description ?? "Discount applied to this cart."}
                    </p>
                  </div>
                  <button
                    className="button-link"
                    disabled={isApplyingCoupon}
                    onClick={() => {
                      void removeCoupon();
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form className="form-grid" onSubmit={applyCoupon}>
                  <label className="form-field">
                    <span>Coupon code</span>
                    <input
                      className="input"
                      onChange={(event) => setCouponCode(event.target.value)}
                      placeholder="SPRING10"
                      value={couponCode}
                    />
                  </label>
                  {couponError ? <p className="form-error">{couponError}</p> : null}
                  <button className="button-link button-link--solid" disabled={isApplyingCoupon} type="submit">
                    {isApplyingCoupon ? "Applying..." : "Apply coupon"}
                  </button>
                </form>
              )}
            </section>

            <section className="commerce-panel">
              <h2>Summary</h2>
              <div className="summary-lines">
                <div className="summary-line">
                  <span>Subtotal</span>
                  <strong>{formatMoney(cart.currency, cart.subtotal)}</strong>
                </div>
                <div className="summary-line">
                  <span>Discounts</span>
                  <strong>-{formatMoney(cart.currency, cart.discountTotal)}</strong>
                </div>
                <div className="summary-line">
                  <span>Shipping</span>
                  <strong>{formatMoney(cart.currency, cart.shippingTotal)}</strong>
                </div>
                <div className="summary-line">
                  <span>Tax</span>
                  <strong>{formatMoney(cart.currency, cart.taxTotal)}</strong>
                </div>
                <div className="summary-line summary-line--total">
                  <span>Total</span>
                  <strong>{formatMoney(cart.currency, cart.grandTotal)}</strong>
                </div>
              </div>

              <div className="inline-actions">
                <Link className="button-link button-link--solid" to="/checkout">
                  Continue to checkout
                </Link>
                <Link className="button-link" to="/products">
                  Keep shopping
                </Link>
              </div>
            </section>
          </aside>
        </div>
      )}
    </PageShell>
  );
};
