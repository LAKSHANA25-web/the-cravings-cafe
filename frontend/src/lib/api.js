const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = (
  configuredApiUrl ||
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "")
).replace(/\/+$/, "");

export function apiUrl(path) {
  if (!apiBaseUrl) {
    throw new Error(
      "The backend API is not configured. Set VITE_API_URL for this deployment."
    );
  }

  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
