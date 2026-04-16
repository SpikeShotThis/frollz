const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

type Params = Record<string, string | number | string[] | number[] | undefined>;
type ApiResponse<T> = { data: T };

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Params,
): Promise<ApiResponse<T>> {
  let url = `${API_BASE_URL}${path}`;

  if (params) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) qs.append(key, String(item));
      } else {
        qs.set(key, String(value));
      }
    }
    const str = qs.toString();
    if (str) url += "?" + str;
  }

  const isFormData = body instanceof FormData;
  const init: RequestInit = {
    method,
    headers: isFormData ? {} : { "Content-Type": "application/json" },
  };
  if (body !== undefined) init.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(url, init);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    console.error("API Error:", err);
    throw err;
  }

  const text = await res.text();
  const data: T = text ? (JSON.parse(text) as T) : (undefined as T);
  return { data };
}

export const api = {
  get: <T>(
    path: string,
    options?: { params?: Params; paramsSerializer?: unknown },
  ) => request<T>("GET", path, undefined, options?.params),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = unknown>(path: string) => request<T>("DELETE", path),
};
