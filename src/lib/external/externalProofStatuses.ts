const TERMINAL_STATUSES = new Set(['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED']);

const RETRYABLE_STATUSES = new Set(['PENDING', 'WAITING_REVIEW']);

export function isTerminalStatus(status?: string | null): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.has(status.toUpperCase());
}

export function isRetryableStatus(status?: string | null): boolean {
  if (!status) return false;
  const normalized = status.toUpperCase();
  if (TERMINAL_STATUSES.has(normalized)) return false;
  return RETRYABLE_STATUSES.has(normalized);
}
