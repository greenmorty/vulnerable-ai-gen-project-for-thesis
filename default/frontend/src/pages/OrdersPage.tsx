/**
 * Responsibility: Implements the customer's paginated order history with cancellation links and detail navigation.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { apiClient } from "../lib/api";
import type { OrderListItem, OrderListResponse, OrderResponse } from "../types/commerce";
import { getApiErrorMessage } from "../utils/api-errors";

const formatMoney = (currency: string, amount: number) => `${currency} ${amount.toFixed(2)}`;

export const OrdersPage = () => {
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<OrderListResponse["pagination"]>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get<OrderListResponse>("/orders", {
        params: {
          page,
          pageSize: pagination.pageSize,
        },
      });

      setItems(data.items);
      setPagination(data.pagination);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "We couldn't load your orders."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, [page]);

  const cancelOrder = async (orderId: string) => {
    setActiveOrderId(orderId);
    setError("");

    try {
      await apiClient.post<OrderResponse>(`/orders/${orderId}/cancel`);
      await fetchOrders();
    } catch (cancelError) {
      setError(getApiErrorMessage(cancelError, "We couldn't cancel that order."));
    } finally {
      setActiveOrderId(null);
    }
  };

  return (
    <PageShell
      eyebrow="Orders"
      title="Your order history"
      description="Track every ShopSphere purchase, review payment state, and open the full detail timeline for each order."
    >
      {error ? <p className="form-alert">{error}</p> : null}

      {loading ? (
        <div className="status-banner">Loading your order history...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet.</h3>
          <p>Your placed orders will appear here once you finish checkout.</p>
          <div className="inline-actions">
            <Link className="button-link button-link--solid" to="/products">
              Start shopping
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="order-list">
            {items.map((order) => (
              <article className="commerce-panel" key={order.id}>
                <div className="order-card__header">
                  <div>
                    <p className="eyebrow">Order {order.orderNumber}</p>
                    <h2>{formatMoney(order.currency, order.grandTotal)}</h2>
                    <p className="profile-meta">
                      Placed {new Date(order.createdAt).toLocaleString()} • {order.itemCount} item
                      {order.itemCount === 1 ? "" : "s"}
                    </p>
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
                    <span>Subtotal</span>
                    <strong>{formatMoney(order.currency, order.subtotal)}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Discount</span>
                    <strong>-{formatMoney(order.currency, order.discountTotal)}</strong>
                  </div>
                </div>

                <div className="inline-actions">
                  <Link className="button-link button-link--solid" to={`/orders/${order.id}`}>
                    View details
                  </Link>
                  {order.status === "PENDING" ? (
                    <button
                      className="button-link"
                      disabled={activeOrderId === order.id}
                      onClick={() => {
                        void cancelOrder(order.id);
                      }}
                      type="button"
                    >
                      {activeOrderId === order.id ? "Cancelling..." : "Cancel order"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="pagination-row">
            <button
              className="button-link"
              disabled={pagination.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <p className="profile-meta">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <button
              className="button-link"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      )}
    </PageShell>
  );
};
