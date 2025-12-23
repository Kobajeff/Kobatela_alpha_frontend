import { normalizeApiError } from './apiError';

export function isNoAdvisorAvailable(error: unknown): boolean {
  const { status, code } = normalizeApiError(error);
  if (status !== 503) return false;

  return !code || code === 'NO_ADVISOR_AVAILABLE';
}
