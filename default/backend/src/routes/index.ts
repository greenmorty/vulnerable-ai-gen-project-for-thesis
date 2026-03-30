/**
 * Responsibility: Collects and mounts all versionless API route groups under a single router.
 */
import { Router } from "express";

import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { cartRouter } from "./cart.routes";
import { categoriesRouter } from "./categories.routes";
import { couponsRouter } from "./coupons.routes";
import { healthRouter } from "./health.routes";
import { inventoryRouter } from "./inventory.routes";
import { ordersRouter } from "./orders.routes";
import { paymentsRouter } from "./payments.routes";
import { productsRouter } from "./products.routes";
import { reviewsRouter } from "./reviews.routes";
import { usersRouter } from "./users.routes";
import { wishlistsRouter } from "./wishlists.routes";

export const apiRouter = Router();

apiRouter.get("/", (_request, response) => {
  response.json({
    message: "Welcome to the ShopSphere API scaffold.",
    version: "0.1.0",
  });
});

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/inventory", inventoryRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/reviews", reviewsRouter);
apiRouter.use("/wishlist", wishlistsRouter);
apiRouter.use("/wishlists", wishlistsRouter);
apiRouter.use("/coupons", couponsRouter);
apiRouter.use("/admin", adminRouter);
