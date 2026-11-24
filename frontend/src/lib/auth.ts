// src/lib/auth.ts
const TOKEN_KEY = "catalogo_token";
const REFRESH_KEY = "catalogo_refresh";

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
export function isAuthenticated() {
  return !!getAccessToken();
}
