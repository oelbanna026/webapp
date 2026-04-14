const DEFAULT_API_BASE = "http://localhost:4000";

function getApiBase() {
  return import.meta.env.VITE_API_URL || DEFAULT_API_BASE;
}

export async function apiRequest(path, options = {}) {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(options.headers || {});
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof data === "object" && data?.error?.message ? data.error.message : res.statusText;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
