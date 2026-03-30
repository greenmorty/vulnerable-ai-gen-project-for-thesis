/**
 * Responsibility: Frames the admin routes with operational navigation and workspace layout.
 */
import { NavLink, Outlet } from "react-router-dom";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? "nav-link nav-link--active" : "nav-link";

export const AdminLayout = () => {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="eyebrow">Back Office</p>
        <h2>ShopSphere Admin</h2>
        <nav className="admin-nav" aria-label="Admin navigation">
          <NavLink className={navLinkClassName} end to="/admin">
            Dashboard
          </NavLink>
          <NavLink className={navLinkClassName} to="/admin/products">
            Products
          </NavLink>
          <NavLink className={navLinkClassName} to="/admin/orders">
            Orders
          </NavLink>
          <NavLink className={navLinkClassName} to="/admin/reviews">
            Reviews
          </NavLink>
          <NavLink className={navLinkClassName} to="/products">
            Storefront
          </NavLink>
        </nav>
      </aside>

      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
};
