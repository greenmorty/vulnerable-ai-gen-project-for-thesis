/**
 * Responsibility: Boots the React application and wraps it with shared auth and wishlist providers.
 */
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <WishlistProvider>
        <App />
      </WishlistProvider>
    </AuthProvider>
  </React.StrictMode>,
);
