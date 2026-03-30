/**
 * Responsibility: Implements the customer order detail page with timeline data, payment retries, and pending-order cancellation.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { apiClient } from "../lib/api";
import type {
  Order,
  OrderResponse,
  PaymentMethod,
  PaymentSimulationResponse,
} from "../types/commerce";
import { getApiErrorMessage } from "../utils/api-errors";
import { resolveMediaUrl } from "../utils/media";

const formatMoney = (currency: string, amount: number) => `${currency} ${amount.toFixed(2)}`;

const renderAddress = (address: Order["shippingAddress"]) => {
  if (!address) {
    return <p className="profile-meta">No address snapshot stored.</p>;
  }

  return (
    <address className="address-card__body">
      <strong>{address.fullName}</strong>
      <span>{address.line1}</span>
      {address.line2 ? <span>{address.line2}</span> : null}
      <span>
        {address.city}
        {address.state ? `, ${address.state}` : ""} {address.postalCode}
      </span>
      <span>{address.country}</span>
      {address.phone ? <span>{address.phone}</span> : null}
    </address>
  );
};

export const OrderDetailsPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrder = async () => {
    if (!id) {
      setError("This order route is missing its identifier.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get<OrderResponse>(`/orders/${id}`);
      setOrder(data.order);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "We couldn't load this order."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrder();
  }, [id]);

  const retryPayment = async (paymentMethod: PaymentMethod = "CARD") => {
    if (!order) {
      return;
    }

    setIsPaying(true);
    setActionError("");

    try {
      const { data } = await apiClient.post<PaymentSimulationResponse>("/payments/simulate", {
        orderId: order.id,
        paymentMethod,
      });

      setOrder(data.order);
    } catch (paymentError) {
      setActionError(getApiErrorMessage(paymentError, "We couldn't simulate payment for this order."));
    } finally {
      setIsPaying(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) {
      return;
    }

    setIsCancelling(true);
    setActionError("");

    try {
      const { data } = await apiClient.post<OrderResponse>(`/orders/${order.id}/cancel`);
      setOrder(data.order);
    } catch (cancelError) {
      setActionError(getApiErrorMessage(cancelError, "We couldn't cancel this order."));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <PageShell
      eyebrow="Orders"
      title={order ? `Order ${order.orderNumber}` : "Order detail"}
      description="Review purchased items, payment attempts, stored addresses, and the latest order lifecycle timestamps."
    >
      {loading ? (
        <div className="status-banner">Loading this order...</div>
      ) : error ? (
        <p className="form-alert">{error}</p>
      ) : order ? (
        <div className="order-detail-layout">
          <section className="commerce-panel">
            <div className="order-card__header">
              <div>
                <p className="eyebrow">Order {order.orderNumber}</p>
                <h2>{formatMoney(order.currency, order.grandTotal)}</h2>
                <p className="profile-meta">Created {new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className="order-card__badges">
                <span className="badge">{order.status}</span>
                {order.latestPaymentStatus ? (
                  <span className="badge">{order.latestPaymentStatus}</span>
                ) : null}
              </div>
            </div>

            <div className="summary-lines">
              <div className="summary-line">
                <span>Placed</span>
                <strong>{order.placedAt ? new Date(order.placedAt).toLocaleString() : "Not available"}</strong>
              </div>
              <div className="summary-line">
                <span>Cancelled</span>
                <strong>
                  {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString() : "Not cancelled"}
                </strong>
              </div>
              <div className="summary-line">
                <span>Fulfilled</span>
                <strong>
                  {order.fulfilledAt ? new Date(order.fulfilledAt).toLocaleString() : "Pending"}
                </strong>
              </div>
            </div>

            {actionError ? <p className="form-alert">{actionError}</p> : null}

            <div className="inline-actions">
              {(order.status === "PENDING" || order.status === "PAYMENT_FAILED") && (
                <button
                  className="button-link button-link--solid"
                  disabled={isPaying}
                  onClick={() => {
                    void retryPayment(order.payments[0]?.method ?? "CARD");
                  }}
                  type="button"
                >
                  {isPaying ? "Processing payment..." : "Simulate payment"}
                </button>
              )}
              {order.status === "PENDING" ? (
                <button
                  className="button-link"
                  disabled={isCancelling}
                  onClick={() => {
                    void cancelOrder();
                  }}
                  type="button"
                >
                  {isCancelling ? "Cancelling..." : "Cancel order"}
                </button>
              ) : null}
              <Link className="button-link" to="/orders">
                Back to orders
              </Link>
            </div>
          </section>

          <section className="commerce-panel">
            <h2>Items</h2>
            <div className="order-items">
              {order.items.map((item) => (
                <article className="cart-item-card" key={item.id}>
                  <Link
                    className="cart-item-card__image"
                    to={item.productId ? `/products/${item.productId}` : "/products"}
                  >
                    {resolveMediaUrl(item.primaryImageUrl) ? (
                      <img alt={item.name} src={resolveMediaUrl(item.primaryImageUrl) ?? ""} />
                    ) : (
                      <span>No image</span>
                    )}
                  </Link>

                  <div className="cart-item-card__content">
                    <div>
                      <h3>{item.name}</h3>
                      <p className="profile-meta">
                        {item.variant?.name ? `${item.variant.name} • ` : ""}SKU {item.sku}
                      </p>
                    </div>
                    <div className="cart-item-card__footer">
                      <span>Qty {item.quantity}</span>
                      <strong>{formatMoney(order.currency, item.totalPrice)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="address-grid">
            <article className="commerce-panel address-card">
              <h2>Shipping address</h2>
              {renderAddress(order.shippingAddress)}
            </article>
            <article className="commerce-panel address-card">
              <h2>Billing address</h2>
              {renderAddress(order.billingAddress)}
            </article>
          </section>

          <section className="commerce-layout">
            <article className="commerce-panel">
              <h2>Payments</h2>
              {order.payments.length === 0 ? (
                <p className="profile-meta">No payment attempts have been recorded yet.</p>
              ) : (
                <div className="summary-lines">
                  {order.payments.map((payment) => (
                    <div className="summary-line summary-line--stack" key={payment.id}>
                      <div>
                        <strong>{payment.method}</strong>
                        <p className="profile-meta">
                          {payment.status}
                          {payment.providerReference ? ` • ${payment.providerReference}` : ""}
                        </p>
                      </div>
                      <strong>{formatMoney(payment.currency, payment.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="commerce-panel">
              <h2>Totals</h2>
              <div className="summary-lines">
                <div className="summary-line">
                  <span>Subtotal</span>
                  <strong>{formatMoney(order.currency, order.subtotal)}</strong>
                </div>
                <div className="summary-line">
                  <span>Discount</span>
                  <strong>-{formatMoney(order.currency, order.discountTotal)}</strong>
                </div>
                <div className="summary-line">
                  <span>Shipping</span>
                  <strong>{formatMoney(order.currency, order.shippingTotal)}</strong>
                </div>
                <div className="summary-line">
                  <span>Tax</span>
                  <strong>{formatMoney(order.currency, order.taxTotal)}</strong>
                </div>
                <div className="summary-line summary-line--total">
                  <span>Total</span>
                  <strong>{formatMoney(order.currency, order.grandTotal)}</strong>
                </div>
              </div>

              {order.coupons.length > 0 ? (
                <div className="summary-lines summary-lines--spaced">
                  {order.coupons.map((coupon) => (
                    <div className="summary-line" key={coupon.id}>
                      <span>{coupon.codePreview}</span>
                      <strong>-{formatMoney(order.currency, coupon.discountAmount)}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          </section>
        </div>
      ) : null}
    </PageShell>
  );
};
