const STORAGE_KEY = 'kobatela_external_token';

export function getExternalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(STORAGE_KEY);
}

export function setExternalToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearExternalToken(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function readTokenFromQuery(
  searchParams?: URLSearchParams | Readonly<URLSearchParams> | null
): string | null {
  if (!searchParams) return null;
  return searchParams.get('token');
}
