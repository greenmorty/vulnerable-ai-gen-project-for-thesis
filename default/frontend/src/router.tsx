/**
 * Responsibility: Defines the frontend route tree for storefront, authenticated, and admin application areas.
 */
import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminProductsPage } from "./pages/AdminProductsPage";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminReviewsPage } from "./pages/AdminReviewsPage";
import { StorefrontLayout } from "./layouts/StorefrontLayout";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { CartPage } from "./pages/CartPage";
import { CatalogPage } from "./pages/CatalogPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OrderDetailsPage } from "./pages/OrderDetailsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductDetailsPage } from "./pages/ProductDetailsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { WishlistPage } from "./pages/WishlistPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <StorefrontLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "products",
        element: <CatalogPage />,
      },
      {
        path: "products/:id",
        element: <ProductDetailsPage />,
      },
      {
        path: "cart",
        element: <CartPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "wishlist",
            element: <WishlistPage />,
          },
          {
            path: "checkout",
            element: <CheckoutPage />,
          },
          {
            path: "orders",
            element: <OrdersPage />,
          },
          {
            path: "orders/:id",
            element: <OrderDetailsPage />,
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "/admin",
    element: <ProtectedRoute requiredRoles={["ADMIN"]} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboardPage />,
          },
          {
            path: "products",
            element: <AdminProductsPage />,
          },
          {
            path: "orders",
            element: <AdminOrdersPage />,
          },
          {
            path: "reviews",
            element: <AdminReviewsPage />,
          },
        ],
      },
    ],
  },
]);
