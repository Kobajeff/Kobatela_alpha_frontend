'use client';

/**
 * Helpers for handling external beneficiary tokens without leaking them.
 *
 * Token transport contract (docs/Backend_info/API_GUIDE (8).md):
 * - Preferred header: Authorization: Bearer <token>
 * - Optional header: X-External-Token: <token>
 * - Legacy (avoid): ?token=<token>
 */
const STORAGE_KEY = 'kobatela_external_token';

export function getExternalTokenFromUrl(searchParams: URLSearchParams): string | null {
  const token = searchParams.get('token');
  if (!token) return null;
  return token;
}

export function getExternalTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(STORAGE_KEY);
}

export function persistExternalToken(token: string) {
  if (typeof window === 'undefined') return;
  // Session-scoped storage only, and only after explicit user action.
  window.sessionStorage.setItem(STORAGE_KEY, token);
}

export function buildExternalAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'X-External-Token': token
  };
}
