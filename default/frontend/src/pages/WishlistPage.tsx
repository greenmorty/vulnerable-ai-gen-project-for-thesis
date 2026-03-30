/**
 * Responsibility: Implements the authenticated wishlist page with saved-product listing and removal controls.
 */
import { Link } from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { useWishlist } from "../contexts/WishlistContext";
import { resolveMediaUrl } from "../utils/media";

const formatMoney = (currency: string, amount: number) => `${currency} ${amount.toFixed(2)}`;

export const WishlistPage = () => {
  const { isLoading, removeProduct, wishlist } = useWishlist();

  return (
    <PageShell
      eyebrow="Wishlist"
      title="Your saved products"
      description="Keep track of products you want to revisit, compare, or move into cart later."
    >
      {isLoading ? (
        <div className="status-banner">Loading your wishlist...</div>
      ) : !wishlist || wishlist.items.length === 0 ? (
        <div className="empty-state">
          <h3>Your wishlist is empty.</h3>
          <p>Save products from the catalog or product pages to keep them close for later.</p>
          <div className="inline-actions">
            <Link className="button-link button-link--solid" to="/products">
              Browse products
            </Link>
          </div>
        </div>
      ) : (
        <div className="order-items">
          {wishlist.items.map((item) => (
            <article className="cart-item-card" key={item.id}>
              <Link className="cart-item-card__image" to={`/products/${item.product.id}`}>
                {resolveMediaUrl(item.product.primaryImageUrl) ? (
                  <img alt={item.product.name} src={resolveMediaUrl(item.product.primaryImageUrl) ?? ""} />
                ) : (
                  <span>No image</span>
                )}
              </Link>

              <div className="cart-item-card__content">
                <div>
                  <h3>
                    <Link to={`/products/${item.product.id}`}>{item.product.name}</Link>
                  </h3>
                  <p className="profile-meta">{item.product.shortDescription ?? "Saved for later review."}</p>
                </div>

                <div className="cart-item-card__footer">
                  <strong>{formatMoney(item.product.currency, item.product.price)}</strong>
                  <div className="inline-actions">
                    <Link className="button-link button-link--solid" to={`/products/${item.product.id}`}>
                      View product
                    </Link>
                    <button
                      className="button-link"
                      onClick={() => {
                        void removeProduct(item.product.id);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
};
