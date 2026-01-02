const STORAGE_KEY = 'kobatela_external_token';

let inMemoryToken: string | null = null;

export function getExternalToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window === 'undefined') return null;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    inMemoryToken = stored;
  }
  return stored;
}

export function setExternalToken(token: string, options?: { persist?: boolean }): void {
  if (typeof window === 'undefined') return;
  inMemoryToken = token;
  if (options?.persist === false) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearExternalToken(): void {
  inMemoryToken = null;
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function stripTokenFromUrl(cleanPath?: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  const nextPath = cleanPath ?? url.pathname;
  const search = url.searchParams.toString();
  const nextUrl = search ? `${nextPath}?${search}` : nextPath;
  window.history.replaceState(window.history.state, '', nextUrl);
}

export function consumeExternalTokenFromQuery(
  searchParams?: URLSearchParams | Readonly<URLSearchParams> | null,
  options?: { replacePath?: string }
): string | null {
  if (!searchParams) return null;
  const token = searchParams.get('token');
  if (!token) return null;
  setExternalToken(token);
  stripTokenFromUrl(options?.replacePath);
  return token;
}
