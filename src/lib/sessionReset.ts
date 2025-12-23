import type { QueryClient } from '@tanstack/react-query';
import { clearAuthToken, isBrowser } from './auth';

export function resetSession(
  queryClient: QueryClient | null,
  options: { redirectTo?: string } = {}
) {
  clearAuthToken();
  queryClient?.clear();

  if (!isBrowser()) return;
  const redirectTo = options.redirectTo ?? '/login';
  if (window.location.pathname !== redirectTo) {
    window.location.assign(redirectTo);
  }
}
