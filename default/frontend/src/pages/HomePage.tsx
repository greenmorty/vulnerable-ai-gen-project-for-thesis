/**
 * Responsibility: Introduces the storefront shell and highlights the major customer and admin domains in the scaffold.
 */
import { PageShell } from "../components/PageShell";

export const HomePage = () => {
  return (
    <PageShell
      eyebrow="Storefront"
      title="ShopSphere is ready for feature work."
      description="This landing page marks the shell of a mid-size e-commerce application with customer journeys, operational tooling, and shared domain boundaries already mapped."
      highlights={[
        "Catalog browsing, categories, wishlists, carts, checkout, orders, and reviews have dedicated route surfaces.",
        "JWT auth with refresh token rotation is reserved in both the backend route tree and frontend auth context.",
        "The admin panel has its own protected layout for inventory, moderation, and reporting workflows.",
      ]}
    />
  );
};

