/**
 * Responsibility: Frames the customer-facing storefront routes with shared navigation and page chrome.
 */
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? "nav-link nav-link--active" : "nav-link";

export const StorefrontLayout = () => {
  const { isAdmin, logout, status, user } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ShopSphere</p>
          <h1 className="brand-title">A modern commerce scaffold</h1>
        </div>

        <nav className="nav-links" aria-label="Storefront navigation">
          <NavLink className={navLinkClassName} end to="/">
            Home
          </NavLink>
          <NavLink className={navLinkClassName} to="/products">
            Catalog
          </NavLink>
          <NavLink className={navLinkClassName} to="/cart">
            Cart
          </NavLink>
          <NavLink className={navLinkClassName} to="/wishlist">
            Wishlist
          </NavLink>
          <NavLink className={navLinkClassName} to="/orders">
            Orders
          </NavLink>
          {status === "authenticated" ? (
            <>
              <NavLink className={navLinkClassName} to="/profile">
                {user?.firstName || "Profile"}
              </NavLink>
              {isAdmin ? (
                <NavLink className={navLinkClassName} to="/admin">
                  Admin
                </NavLink>
              ) : null}
              <button
                className="nav-link nav-link--button"
                onClick={() => {
                  void logout();
                }}
                type="button"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink className={navLinkClassName} to="/login">
                Login
              </NavLink>
              <NavLink className={navLinkClassName} to="/register">
                Register
              </NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
