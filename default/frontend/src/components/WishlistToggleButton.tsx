/**
 * Responsibility: Renders a reusable wishlist toggle button that syncs with the shared wishlist context.
 */
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import { getApiErrorMessage } from "../utils/api-errors";

interface WishlistToggleButtonProps {
  productId: string;
  className?: string;
  onError?: (message: string) => void;
}

export const WishlistToggleButton = ({
  productId,
  className,
  onError,
}: WishlistToggleButtonProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { status } = useAuth();
  const { isLoading, isWishlisted, toggleProduct } = useWishlist();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wishlisted = isWishlisted(productId);

  const handleClick = async () => {
    if (status !== "authenticated") {
      navigate("/login", {
        state: {
          from: `${location.pathname}${location.search}`,
        },
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await toggleProduct(productId);
    } catch (error) {
      onError?.(getApiErrorMessage(error, "We couldn't update your wishlist."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={wishlisted}
      className={className ?? "button-link wishlist-button"}
      disabled={isLoading || isSubmitting}
      onClick={() => {
        void handleClick();
      }}
      type="button"
    >
      {wishlisted ? "Saved" : "Save"}
    </button>
  );
};
