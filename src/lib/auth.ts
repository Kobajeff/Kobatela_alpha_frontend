// Utility helpers to manage authentication token storage in browser-safe way.
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function setAuthToken(token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem('kobatela_token', token);
}

export function getAuthToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem('kobatela_token');
}

export function clearAuthToken(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem('kobatela_token');
}
