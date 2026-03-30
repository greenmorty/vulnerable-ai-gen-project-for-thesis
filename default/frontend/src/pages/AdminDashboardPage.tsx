/**
 * Responsibility: Implements the admin dashboard with commerce stat cards, a revenue chart, top products, and low-stock alerts.
 */
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageShell } from "../components/PageShell";
import { apiClient } from "../lib/api";
import type {
  AdminDashboardStatsResponse,
  AdminInventoryResponse,
} from "../types/admin";
import { getApiErrorMessage } from "../utils/api-errors";
import { resolveMediaUrl } from "../utils/media";

const formatMoney = (amount: number) => `USD ${amount.toFixed(2)}`;

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState<AdminDashboardStatsResponse | null>(null);
  const [inventory, setInventory] = useState<AdminInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [statsResponse, inventoryResponse] = await Promise.all([
          apiClient.get<AdminDashboardStatsResponse>("/admin/stats"),
          apiClient.get<AdminInventoryResponse>("/admin/inventory"),
        ]);

        if (!cancelled) {
          setStats(statsResponse.data);
          setInventory(inventoryResponse.data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(getApiErrorMessage(fetchError, "We couldn't load admin dashboard data."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell
      eyebrow="Admin"
      title="Commerce operations dashboard"
      description="Track revenue momentum, watch low-stock pressure, and see which products are pulling the most weight over the last 30 days."
    >
      {error ? <p className="form-alert">{error}</p> : null}

      {loading ? (
        <div className="status-banner">Loading dashboard analytics...</div>
      ) : stats && inventory ? (
        <div className="dashboard-grid">
          <section className="stat-card-grid">
            <article className="stat-card">
              <p className="eyebrow">Revenue</p>
              <h2>{formatMoney(stats.summary.totalRevenue)}</h2>
              <p className="profile-meta">Captured across completed commerce states.</p>
            </article>
            <article className="stat-card">
              <p className="eyebrow">Orders</p>
              <h2>{stats.summary.orderCount}</h2>
              <p className="profile-meta">Total orders in the ShopSphere store.</p>
            </article>
            <article className="stat-card">
              <p className="eyebrow">Customers</p>
              <h2>{stats.summary.userCount}</h2>
              <p className="profile-meta">Active user accounts excluding soft-deleted records.</p>
            </article>
          </section>

          <section className="commerce-panel chart-panel">
            <div className="section-heading">
              <div>
                <h2>Revenue trend</h2>
                <p className="profile-meta">Last 30 days of paid order volume.</p>
              </div>
            </div>
            <div className="chart-shell">
              <ResponsiveContainer height={320} width="100%">
                <AreaChart data={stats.revenueSeries}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#d35d3c" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#d35d3c" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(30, 36, 50, 0.08)" strokeDasharray="4 4" />
                  <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} />
                  <YAxis tickFormatter={(value) => `$${Number(value)}`} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Area
                    dataKey="revenue"
                    fill="url(#revenueFill)"
                    fillOpacity={1}
                    stroke="#d35d3c"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="commerce-panel">
            <h2>Top products, last 30 days</h2>
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Units sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProducts.map((product) => (
                    <tr key={`${product.sku}-${product.productId ?? "archived"}`}>
                      <td>
                        <div className="admin-product-cell">
                          <div className="admin-product-cell__image">
                            {resolveMediaUrl(product.primaryImageUrl) ? (
                              <img alt={product.name} src={resolveMediaUrl(product.primaryImageUrl) ?? ""} />
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
                      <td>{product.quantitySold}</td>
                      <td>{formatMoney(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="commerce-panel">
            <h2>Low-stock alerts</h2>
            <p className="profile-meta">
              Showing products with fewer than {inventory.threshold} available units after reservations.
            </p>
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Variant</th>
                    <th>Available</th>
                    <th>Reserved</th>
                    <th>Reorder point</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.items.length > 0 ? (
                    inventory.items.map((item) => (
                      <tr key={item.inventoryItemId}>
                        <td>
                          <div className="admin-product-cell">
                            <div className="admin-product-cell__image">
                              {resolveMediaUrl(item.product.primaryImageUrl) ? (
                                <img
                                  alt={item.product.name}
                                  src={resolveMediaUrl(item.product.primaryImageUrl) ?? ""}
                                />
                              ) : (
                                <span>No image</span>
                              )}
                            </div>
                            <div>
                              <strong>{item.product.name}</strong>
                              <p className="profile-meta">{item.product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {item.variant.name}
                          <p className="profile-meta">{item.variant.sku}</p>
                        </td>
                        <td>{item.availableQuantity}</td>
                        <td>{item.reservedQuantity}</td>
                        <td>{item.reorderPoint}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <p>No low-stock alerts right now.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </PageShell>
  );
};
