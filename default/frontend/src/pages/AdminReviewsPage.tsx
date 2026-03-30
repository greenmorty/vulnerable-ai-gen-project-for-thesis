/**
 * Responsibility: Implements the admin review moderation queue with approve, reject, and delete actions.
 */
import { useEffect, useState } from "react";

import { PageShell } from "../components/PageShell";
import { StarRating } from "../components/catalog/StarRating";
import { apiClient } from "../lib/api";
import type { AdminReviewRecord, AdminReviewsResponse, ModerationReviewStatus } from "../types/admin";
import { getApiErrorMessage } from "../utils/api-errors";

export const AdminReviewsPage = () => {
  const [items, setItems] = useState<AdminReviewRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminReviewsResponse["pagination"]>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<ModerationReviewStatus | "">("PENDING");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchReviews = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get<AdminReviewsResponse>("/admin/reviews", {
        params: {
          page,
          pageSize: pagination.pageSize,
          status: statusFilter || undefined,
          search: search || undefined,
        },
      });

      setItems(data.items);
      setPagination(data.pagination);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "We couldn't load the moderation queue."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReviews();
  }, [page, statusFilter, search]);

  const moderateReview = async (reviewId: string, status: Exclude<ModerationReviewStatus, "PENDING">) => {
    setActiveReviewId(reviewId);
    setError("");

    try {
      await apiClient.patch(`/reviews/${reviewId}/moderate`, {
        status,
      });
      await fetchReviews();
    } catch (moderationError) {
      setError(getApiErrorMessage(moderationError, "We couldn't update that review."));
    } finally {
      setActiveReviewId(null);
    }
  };

  const deleteReview = async (reviewId: string) => {
    setActiveReviewId(reviewId);
    setError("");

    try {
      await apiClient.delete(`/reviews/${reviewId}`);
      await fetchReviews();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "We couldn't delete that review."));
    } finally {
      setActiveReviewId(null);
    }
  };

  return (
    <PageShell
      eyebrow="Admin"
      title="Review moderation queue"
      description="Screen customer reviews before they reach the storefront, with fast approve, reject, and delete actions."
    >
      <div className="admin-toolbar">
        <label className="form-field admin-toolbar__search">
          <span>Search reviews</span>
          <input
            className="input"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Product, customer, or review text"
            type="search"
            value={search}
          />
        </label>

        <label className="form-field admin-toolbar__status">
          <span>Status</span>
          <select
            className="input"
            onChange={(event) => {
              setStatusFilter(event.target.value as ModerationReviewStatus | "");
              setPage(1);
            }}
            value={statusFilter}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}

      {loading ? (
        <div className="status-banner">Loading review moderation data...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>No reviews matched the current moderation filters.</p>
        </div>
      ) : (
        <div className="review-list">
          {items.map((review) => (
            <article className="review-card review-card--admin" key={review.id}>
              <div className="review-card__header">
                <div>
                  <strong>{review.product.name}</strong>
                  <p className="profile-meta">
                    {review.user.firstName} {review.user.lastName} • {review.user.email}
                  </p>
                </div>
                <div className="order-card__badges">
                  <span className="badge">{review.status}</span>
                  {review.verifiedPurchase ? <span className="badge">Verified purchase</span> : null}
                </div>
              </div>

              <StarRating rating={review.rating} />
              <p>{review.body}</p>
              <p className="profile-meta">{new Date(review.createdAt).toLocaleString()}</p>

              <div className="inline-actions">
                {review.status === "PENDING" ? (
                  <>
                    <button
                      className="button-link button-link--solid"
                      disabled={activeReviewId === review.id}
                      onClick={() => {
                        void moderateReview(review.id, "APPROVED");
                      }}
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      className="button-link"
                      disabled={activeReviewId === review.id}
                      onClick={() => {
                        void moderateReview(review.id, "REJECTED");
                      }}
                      type="button"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  className="button-link"
                  disabled={activeReviewId === review.id}
                  onClick={() => {
                    void deleteReview(review.id);
                  }}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
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
