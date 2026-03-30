/**
 * Responsibility: Declares admin-only endpoints for operational dashboards, user management, and reporting.
 */
import { Router } from "express";

import {
  getDashboardStats,
  getInventoryAlerts,
} from "../controllers/admin-dashboard.controller";
import { getAdminOrders } from "../controllers/admin-orders.controller";
import {
  createAdminProduct,
  getAdminProducts,
  softDeleteAdminProduct,
  updateAdminProduct,
  uploadAdminProductImage,
} from "../controllers/admin-products.controller";
import { listUsers, softDeleteUser } from "../controllers/admin-users.controller";
import { getAdminReviewQueue } from "../controllers/reviews.controller";
import { requireAuth } from "../middleware/authenticate";
import { requireRole } from "../middleware/authorize";
import {
  productImageUpload,
  requireUploadedImage,
} from "../middleware/upload-product-image";
import { validateRequest } from "../middleware/validate-request";
import { adminOrderListQuerySchema } from "../schemas/commerce.schemas";
import {
  adminProductListQuerySchema,
  createProductBodySchema,
  productIdParamsSchema,
  updateProductBodySchema,
} from "../schemas/product.schemas";
import { adminReviewListQuerySchema } from "../schemas/review.schemas";
import {
  adminUserListQuerySchema,
  userIdParamsSchema,
} from "../schemas/user.schemas";
import { asyncHandler } from "../utils/async-handler";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get(
  "/users",
  validateRequest({ query: adminUserListQuerySchema }),
  asyncHandler(listUsers),
);
adminRouter.delete(
  "/users/:id",
  validateRequest({ params: userIdParamsSchema }),
  asyncHandler(softDeleteUser),
);
adminRouter.get(
  "/products",
  validateRequest({ query: adminProductListQuerySchema }),
  asyncHandler(getAdminProducts),
);
adminRouter.post(
  "/products",
  validateRequest({ body: createProductBodySchema }),
  asyncHandler(createAdminProduct),
);
adminRouter.post(
  "/products/:id/images",
  validateRequest({ params: productIdParamsSchema }),
  productImageUpload.single("image"),
  requireUploadedImage,
  asyncHandler(uploadAdminProductImage),
);
adminRouter.put(
  "/products/:id",
  validateRequest({
    params: productIdParamsSchema,
    body: updateProductBodySchema,
  }),
  asyncHandler(updateAdminProduct),
);
adminRouter.delete(
  "/products/:id",
  validateRequest({ params: productIdParamsSchema }),
  asyncHandler(softDeleteAdminProduct),
);
adminRouter.get("/dashboard", asyncHandler(getDashboardStats));
adminRouter.get("/stats", asyncHandler(getDashboardStats));
adminRouter.get(
  "/orders",
  validateRequest({ query: adminOrderListQuerySchema }),
  asyncHandler(getAdminOrders),
);
adminRouter.get("/inventory-alerts", asyncHandler(getInventoryAlerts));
adminRouter.get("/inventory", asyncHandler(getInventoryAlerts));
adminRouter.get(
  "/reviews",
  validateRequest({ query: adminReviewListQuerySchema }),
  asyncHandler(getAdminReviewQueue),
);
adminRouter.get(
  "/reviews/moderation",
  validateRequest({ query: adminReviewListQuerySchema }),
  asyncHandler(getAdminReviewQueue),
);
