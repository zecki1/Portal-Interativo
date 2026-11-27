import { getAccessToken, saveTokens, clearTokens } from "./auth";

export const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:3002/api/v1`;

interface ApiEnvelope<T> {
  data: T;
  error: { message?: string } | null;
  meta?: unknown;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  const token = getAccessToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };

  // FormData define o Content-Type (com boundary) automaticamente.
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
  }

  // Tenta renovar o access token uma vez em caso de 401.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    // Sem token/cookie de refresh conhecido não há o que renovar: evita uma
    // segunda requisição 401 desnecessária (ruído no console / Lighthouse).
    const temSessao = !!getAccessToken() || !!localStorage.getItem("catalogo_refresh");
    const refreshed = temSessao ? await tryRefresh() : false;
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) headers.Authorization = `Bearer ${newToken}`;
      try {
        res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
      } catch {
        throw new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
      }
    }
  }

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok) {
    if (res.status === 401) clearTokens();
    const mensagem =
      json?.error?.message ||
      (res.status === 401 ? "Sessão expirada. Faça login novamente." : `Erro ${res.status} ao acessar o servidor.`);
    throw new Error(mensagem);
  }

  return (json ?? { data: null as T, error: null }) as ApiEnvelope<T>;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    if (json?.data?.accessToken) {
      const refresh = localStorage.getItem("catalogo_refresh") || "";
      saveTokens(json.data.accessToken, refresh);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
