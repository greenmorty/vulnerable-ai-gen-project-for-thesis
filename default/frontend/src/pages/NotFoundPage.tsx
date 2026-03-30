/**
 * Responsibility: Provides a fallback page when the user navigates to an unknown frontend route.
 */
import { Link } from "react-router-dom";

import { PageShell } from "../components/PageShell";

export const NotFoundPage = () => {
  return (
    <PageShell
      eyebrow="404"
      title="This route is outside the ShopSphere map."
      description="The requested page does not exist in the current scaffold."
      highlights={["Use the primary navigation to return to a scaffolded storefront or admin route."]}
    >
      <div className="inline-actions">
        <Link className="button-link" to="/">
          Return home
        </Link>
      </div>
    </PageShell>
  );
};

