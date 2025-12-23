import type { SenderEscrowSummary } from '@/types/api';

const FUNDING_TERMINAL_STATUSES = new Set([
  'FUNDED',
  'RELEASABLE',
  'RELEASED',
  'REFUNDED',
  'CANCELLED'
]);

export function isFundingTerminal(summary?: SenderEscrowSummary | null): boolean {
  const status = summary?.escrow?.status?.toUpperCase();
  if (!status) return false;
  return FUNDING_TERMINAL_STATUSES.has(status);
}

export function isFundingInProgress(summary?: SenderEscrowSummary | null): boolean {
  const status = summary?.escrow?.status?.toUpperCase();
  if (!status) return false;
  return !FUNDING_TERMINAL_STATUSES.has(status);
}
