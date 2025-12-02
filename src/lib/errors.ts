import axios from 'axios';

export function isNoAdvisorAvailable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  const data = error.response?.data as { error?: { code?: string }; code?: string } | undefined;
  const code = data?.error?.code ?? data?.code;

  if (status !== 503) return false;

  return !code || code === 'NO_ADVISOR_AVAILABLE';
}
