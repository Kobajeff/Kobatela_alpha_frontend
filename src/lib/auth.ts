import type { QueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/types/api';
import { normalizeAuthUser } from './authIdentity';
import { queryKeys } from './queryKeys';

// Utility helpers to manage authentication token storage in browser-safe way.
const TOKEN_KEY = 'kobatela_token';
const USER_KEY = 'kobatela_user';
const NOTICE_KEY = 'kobatela_auth_notice';
const NOTICE_EVENT = 'kobatela:auth-notice';

export type AuthNotice = {
  message: string;
  variant?: 'success' | 'error' | 'info';
};

export type StoredAuthUser = Pick<
  AuthUser,
  'id' | 'email' | 'username' | 'role' | 'scopes' | 'api_scopes' | 'scope' | 'permissions'
>;

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function setAuthToken(token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function setAuthUser(user: AuthUser): void {
  if (!isBrowser()) return;
  const stored: StoredAuthUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    scopes: user.scopes,
    api_scopes: user.api_scopes,
    scope: user.scope,
    permissions: user.permissions
  };
  window.localStorage.setItem(USER_KEY, JSON.stringify(stored));
}

export function getAuthUser(): StoredAuthUser | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

export function clearAuthUser(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(USER_KEY);
}

export function hydrateSession(queryClient: QueryClient): void {
  if (!isBrowser()) return;
  if (!getAuthToken()) return;
  const user = getAuthUser();
  if (!user) return;
  queryClient.setQueryData(queryKeys.auth.me(), normalizeAuthUser(user));
}

export function setAuthNotice(notice: AuthNotice): void {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(NOTICE_KEY, JSON.stringify(notice));
  window.dispatchEvent(new CustomEvent(NOTICE_EVENT));
}

export function consumeAuthNotice(): AuthNotice | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(NOTICE_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(NOTICE_KEY);
  try {
    return JSON.parse(raw) as AuthNotice;
  } catch {
    return { message: raw, variant: 'info' };
  }
}

export function getAuthNoticeEventName(): string {
  return NOTICE_EVENT;
}
