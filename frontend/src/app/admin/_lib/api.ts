// Tiny client for /api/admin/*. The JWT lives in localStorage and is sent as a Bearer token.
import { API_URL } from "../../lib/api";

export const TOKEN_KEY = "vv_admin_token";

export const getToken = () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY));
export const setToken = (t: string) => window.localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(path: string, init: RequestInit = {}, isForm = false): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && init.body) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}/admin${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // expired / invalid session -> back to login (but not for the login call itself)
    if (res.status === 401 && !path.startsWith("/auth/login") && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/admin/login";
    }
    throw new ApiError(body.message || `Request failed (${res.status})`, res.status, body.errors || {});
  }
  return res;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await request(path, init);
  return res.json() as Promise<T>;
}

export const post = <T,>(path: string, data: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const put = <T,>(path: string, data: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(data) });
export const patch = <T,>(path: string, data: unknown) => api<T>(path, { method: "PATCH", body: JSON.stringify(data) });
export const del = <T,>(path: string) => api<T>(path, { method: "DELETE" });

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await request("/upload", { method: "POST", body: fd }, true);
  return ((await res.json()) as { url: string }).url;
}

export async function downloadFile(path: string, filename: string) {
  const res = await request(path);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== false) sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};
