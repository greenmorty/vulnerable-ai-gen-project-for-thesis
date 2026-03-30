/**
 * Responsibility: Owns authenticated wishlist state and exposes add/remove/toggle helpers across the storefront.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { useAuth } from "./AuthContext";
import { apiClient } from "../lib/api";
import type { Wishlist, WishlistResponse } from "../types/wishlist";

interface WishlistContextValue {
  wishlist: Wishlist | null;
  productIds: Set<string>;
  isLoading: boolean;
  refreshWishlist: () => Promise<void>;
  addProduct: (productId: string) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  toggleProduct: (productId: string) => Promise<boolean>;
  isWishlisted: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export const WishlistProvider = ({ children }: PropsWithChildren) => {
  const { status } = useAuth();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWishlist = async () => {
    setIsLoading(true);

    try {
      const { data } = await apiClient.get<WishlistResponse>("/wishlist");
      setWishlist(data.wishlist);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      void fetchWishlist().catch(() => {
        setWishlist(null);
      });
      return;
    }

    if (status === "guest") {
      setWishlist(null);
      setIsLoading(false);
    }
  }, [status]);

  const ensureAuthenticated = () => {
    if (status !== "authenticated") {
      throw new Error("Authentication is required.");
    }
  };

  const applyWishlistResponse = (payload: WishlistResponse) => {
    setWishlist(payload.wishlist);
  };

  const addProduct = async (productId: string) => {
    ensureAuthenticated();
    const { data } = await apiClient.post<WishlistResponse>("/wishlist", {
      productId,
    });
    applyWishlistResponse(data);
  };

  const removeProduct = async (productId: string) => {
    ensureAuthenticated();
    const { data } = await apiClient.delete<WishlistResponse>("/wishlist", {
      data: {
        productId,
      },
    });
    applyWishlistResponse(data);
  };

  const productIds = new Set(wishlist?.productIds ?? []);

  const toggleProduct = async (productId: string) => {
    if (productIds.has(productId)) {
      await removeProduct(productId);
      return false;
    }

    await addProduct(productId);
    return true;
  };

  const isWishlisted = (productId: string) => productIds.has(productId);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        productIds,
        isLoading,
        refreshWishlist: fetchWishlist,
        addProduct,
        removeProduct,
        toggleProduct,
        isWishlisted,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider.");
  }

  return context;
};
