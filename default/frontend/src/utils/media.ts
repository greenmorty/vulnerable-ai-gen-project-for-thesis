/**
 * Responsibility: Resolves backend-served media paths into browser-safe absolute URLs for the frontend.
 */
const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000/api";

const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;

export const resolveMediaUrl = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${apiOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
};

