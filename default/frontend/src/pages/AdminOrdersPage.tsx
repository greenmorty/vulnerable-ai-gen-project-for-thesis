/**
 * Responsibility: Implements the admin order operations view with filters, pagination, and CSV export.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { apiClient } from "../lib/api";
import type { AdminOrderListResponse, OrderListItem, OrderStatus, PaymentStatus } from "../types/commerce";
import { getApiErrorMessage } from "../utils/api-errors";

const formatMoney = (currency: string, amount: number) => `${currency} ${amount.toFixed(2)}`;

export const AdminOrdersPage = () => {
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminOrderListResponse["pagination"]>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const requestParams = {
    page,
    pageSize: pagination.pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
    paymentStatus: paymentStatusFilter || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get<AdminOrderListResponse>("/admin/orders", {
        params: requestParams,
      });

      setItems(data.items);
      setPagination(data.pagination);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "We couldn't load admin orders."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, [page, search, statusFilter, paymentStatusFilter, fromDate, toDate]);

  const exportCsv = async () => {
    setExporting(true);
    setError("");

    try {
      const { data } = await apiClient.get<Blob>("/admin/orders", {
        params: {
          ...requestParams,
          export: "csv",
        },
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "shopsphere-orders.csv";
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (exportError) {
      setError(getApiErrorMessage(exportError, "We couldn't export the order CSV."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell
      eyebrow="Admin"
      title="Order operations"
      description="Filter, review, and export orders across the ShopSphere store from one back-office workspace."
    >
      <div className="admin-toolbar">
        <label className="form-field admin-toolbar__search">
          <span>Search orders</span>
          <input
            className="input"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Order number, email, or customer name"
            type="search"
            value={search}
          />
        </label>

        <label className="form-field admin-toolbar__status">
          <span>Order status</span>
          <select
            className="input"
            onChange={(event) => {
              setStatusFilter(event.target.value as OrderStatus | "");
              setPage(1);
            }}
            value={statusFilter}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAYMENT_FAILED">Payment failed</option>
            <option value="PAID">Paid</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </label>

        <label className="form-field admin-toolbar__status">
          <span>Payment status</span>
          <select
            className="input"
            onChange={(event) => {
              setPaymentStatusFilter(event.target.value as PaymentStatus | "");
              setPage(1);
            }}
            value={paymentStatusFilter}
          >
            <option value="">All payment statuses</option>
            <option value="PENDING">Pending</option>
            <option value="AUTHORIZED">Authorized</option>
            <option value="CAPTURED">Captured</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>

        <label className="form-field">
          <span>From</span>
          <input
            className="input"
            onChange={(event) => {
              setFromDate(event.target.value);
              setPage(1);
            }}
            type="date"
            value={fromDate}
          />
        </label>

        <label className="form-field">
          <span>To</span>
          <input
            className="input"
            onChange={(event) => {
              setToDate(event.target.value);
              setPage(1);
            }}
            type="date"
            value={toDate}
          />
        </label>

        <button
          className="button-link button-link--solid"
          disabled={exporting}
          onClick={() => {
            void exportCsv();
          }}
          type="button"
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}

      {loading ? (
        <div className="status-banner">Loading order operations data...</div>
      ) : (
        <div className="table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Placed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <p className="profile-meta">{order.itemCount} item(s)</p>
                    </td>
                    <td>
                      <strong>
                        {order.customer.firstName} {order.customer.lastName}
                      </strong>
                      <p className="profile-meta">{order.customer.email}</p>
                    </td>
                    <td>
                      <span className="badge">{order.status}</span>
                    </td>
                    <td>
                      {order.latestPaymentStatus ? (
                        <>
                          <span className="badge">{order.latestPaymentStatus}</span>
                          <p className="profile-meta">{order.latestPaymentMethod ?? "No method"}</p>
                        </>
                      ) : (
                        <span className="profile-meta">No payment</span>
                      )}
                    </td>
                    <td>{formatMoney(order.currency, order.grandTotal)}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="table-actions">
                        <Link className="button-link" to={`/orders/${order.id}`}>
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <p>No orders matched the current admin filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
    </PageShell>
  );
};
