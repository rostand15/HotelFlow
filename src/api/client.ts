import { ApiError } from "./errors";
import { mockApi } from "./mockApi";

export { ApiError };

// Modo demonstração: sem backend, com dados fictícios em memória.
// Para usar o backend de verdade, crie frontend/.env com: VITE_USE_MOCK=false
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = localStorage.getItem("token");

  if (USE_MOCK) return mockApi<T>(path, options.method ?? "GET", options.body, token);

  const res = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && !path.startsWith("/auth/login")) {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Algo deu errado. Tente de novo.");
  return data as T;
}
