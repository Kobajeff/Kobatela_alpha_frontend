import type { QueryClient } from '@tanstack/react-query';
import { clearAuthToken, clearAuthUser, isBrowser } from './auth';

export function resetSession(
  queryClient: QueryClient | null,
  options: { redirectTo?: string } = {}
) {
  clearAuthToken();
  clearAuthUser();
  queryClient?.clear();

  if (!isBrowser()) return;
  const redirectTo = options.redirectTo ?? '/login';
  if (window.location.pathname !== redirectTo) {
    window.location.replace(redirectTo);
  }
}
