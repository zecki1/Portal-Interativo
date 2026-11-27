// src/lib/auth.ts
const TOKEN_KEY = "catalogo_token";
const REFRESH_KEY = "catalogo_refresh";
const USER_KEY = "catalogo_user";

export interface LoggedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function saveUser(user: LoggedUser | null | undefined) {
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): LoggedUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as LoggedUser) : null;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
export function isAuthenticated() {
  return !!getAccessToken();
}
