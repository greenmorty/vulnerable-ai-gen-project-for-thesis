/**
 * Responsibility: Provides a reusable content shell for scaffolded storefront and admin placeholder pages.
 */
import type { ReactNode } from "react";

interface PageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  highlights?: string[];
  children?: ReactNode;
}

export const PageShell = ({
  eyebrow,
  title,
  description,
  highlights,
  children,
}: PageShellProps) => {
  return (
    <section className="page-shell">
      <header className="page-shell__header">
        <p className="page-shell__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-shell__description">{description}</p>
      </header>

      {highlights && highlights.length > 0 ? (
        <div className="card-grid">
          {highlights.map((highlight) => (
            <article className="info-card" key={highlight}>
              <p>{highlight}</p>
            </article>
          ))}
        </div>
      ) : null}

      {children}
    </section>
  );
};

