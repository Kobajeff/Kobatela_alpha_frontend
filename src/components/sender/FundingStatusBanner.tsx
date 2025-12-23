'use client';

import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';

const STILL_PROCESSING_AFTER_MS = 60_000;
const DELAYED_PROCESSING_AFTER_MS = 3 * 60_000;

type FundingStatusBannerProps = {
  isActive: boolean;
  elapsedMs: number;
  lastUpdatedAt?: string | Date | null;
  isFetching?: boolean;
  onRefresh?: () => void;
};

export function FundingStatusBanner({
  isActive,
  elapsedMs,
  lastUpdatedAt,
  isFetching,
  onRefresh
}: FundingStatusBannerProps) {
  if (!isActive) return null;

  const showDelayed = elapsedMs >= DELAYED_PROCESSING_AFTER_MS;
  const showStillProcessing = elapsedMs >= STILL_PROCESSING_AFTER_MS && !showDelayed;
  const lastUpdatedLabel = lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '--';

  const message = (() => {
    if (showDelayed) {
      return 'Processing delayed. Gardez la page ouverte, rafraîchissez ou revenez plus tard.';
    }
    if (showStillProcessing) {
      return 'Still processing — this can take a few minutes.';
    }
    return 'Processing funding…';
  })();

  return (
    <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium">{message}</p>
        <p className="text-xs text-amber-800">Last updated : {lastUpdatedLabel}</p>
      </div>
      {onRefresh && (
        <Button variant="outline" onClick={onRefresh} disabled={isFetching}>
          Refresh now
        </Button>
      )}
    </div>
  );
}
