import type { SenderEscrowSummaryUI } from '@/types/ui';

const FUNDING_TERMINAL_STATUSES = new Set([
  'FUNDED',
  'RELEASABLE',
  'RELEASED',
  'REFUNDED',
  'CANCELLED'
]);

export function isFundingTerminal(summary?: SenderEscrowSummaryUI | null): boolean {
  const status = summary?.escrow?.status?.toUpperCase();
  if (!status) return false;
  return FUNDING_TERMINAL_STATUSES.has(status);
}

export function isFundingInProgress(summary?: SenderEscrowSummaryUI | null): boolean {
  const status = summary?.escrow?.status?.toUpperCase();
  if (!status) return false;
  return !FUNDING_TERMINAL_STATUSES.has(status);
}
