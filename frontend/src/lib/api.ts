import { getAccessToken } from "./auth";

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

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok) {
    const mensagem =
      json?.error?.message ||
      (res.status === 401 ? "E-mail ou senha inválidos." : `Erro ${res.status} ao acessar o servidor.`);
    throw new Error(mensagem);
  }

  return (json ?? { data: null as T, error: null }) as ApiEnvelope<T>;
}
