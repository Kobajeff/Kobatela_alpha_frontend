export type PollingProfile = {
  name: string;
  maxDurationMs: number;
  getIntervalMs: (elapsedMs: number) => number | false;
  shouldContinue: (data: unknown) => boolean;
  onTimeoutMessage: string;
};

const TERMINAL_ESCROW_STATUSES = new Set([
  'FUNDED',
  'RELEASABLE',
  'REFUNDED',
  'CANCELLED'
]);

const TERMINAL_PAYMENT_STATUSES = new Set(['SETTLED', 'ERROR', 'REFUNDED']);

const ACTIVE_MILESTONE_STATUSES = new Set(['PENDING_REVIEW', 'PAYING']);

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.toUpperCase();
}

function getValueAtPath(data: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, data);
}

function getStatuses(data: unknown, paths: string[]): string[] {
  const statuses: string[] = [];
  paths.forEach((path) => {
    const status = normalizeStatus(getValueAtPath(data, path));
    if (status) statuses.push(status);
  });
  return statuses;
}

function getMilestoneStatuses(data: unknown): string[] {
  const milestones =
    getValueAtPath(data, 'milestones') ?? getValueAtPath(data, 'escrow.milestones');
  if (!Array.isArray(milestones)) return [];
  return milestones
    .map((milestone) => normalizeStatus((milestone as Record<string, unknown>)?.status))
    .filter((status): status is string => Boolean(status));
}

function getPaymentStatuses(data: unknown): string[] {
  const statuses = getStatuses(data, ['payment.status', 'status']);
  const payments = getValueAtPath(data, 'payments');
  if (Array.isArray(payments)) {
    payments.forEach((payment) => {
      const status = normalizeStatus((payment as Record<string, unknown>)?.status);
      if (status) statuses.push(status);
    });
  }
  return statuses;
}

export const pollingProfiles = {
  fundingEscrow: {
    name: 'fundingEscrow',
    maxDurationMs: 5 * 60 * 1000,
    getIntervalMs: (elapsedMs) => (elapsedMs < 60 * 1000 ? 3_000 : 10_000),
    shouldContinue: (data) => {
      const status = getStatuses(data, ['escrow.status', 'status'])[0];
      if (!status) return true;
      return !TERMINAL_ESCROW_STATUSES.has(status);
    },
    onTimeoutMessage:
      'Funding is taking longer than expected. Please refresh later for the latest status.'
  },
  proofReview: {
    name: 'proofReview',
    maxDurationMs: 5 * 60 * 1000,
    getIntervalMs: (elapsedMs) => (elapsedMs < 2 * 60 * 1000 ? 5_000 : 15_000),
    shouldContinue: (data) => {
      const status = getStatuses(data, ['status', 'proof.status'])[0];
      if (!status) return true;
      return status === 'PENDING';
    },
    onTimeoutMessage:
      'Proof review is taking longer than expected. Please refresh later for updates.'
  },
  milestoneProgression: {
    name: 'milestoneProgression',
    maxDurationMs: 5 * 60 * 1000,
    getIntervalMs: (elapsedMs) => {
      if (elapsedMs < 60 * 1000) return 8_000;
      return 12_000;
    },
    shouldContinue: (data) => {
      const statuses = getMilestoneStatuses(data);
      if (statuses.length === 0) return true;
      return statuses.some((status) => ACTIVE_MILESTONE_STATUSES.has(status));
    },
    onTimeoutMessage:
      'Milestone progression is taking longer than expected. Please refresh later.'
  },
  payoutStatus: {
    name: 'payoutStatus',
    maxDurationMs: 3 * 60 * 1000,
    getIntervalMs: (elapsedMs) => (elapsedMs < 60 * 1000 ? 5_000 : 20_000),
    shouldContinue: (data) => {
      const statuses = getPaymentStatuses(data);
      if (statuses.length === 0) return true;
      return !statuses.some((status) => TERMINAL_PAYMENT_STATUSES.has(status));
    },
    onTimeoutMessage: 'Payout status is taking longer than expected. Please refresh later.'
  },
  webhookCatchup: {
    name: 'webhookCatchup',
    maxDurationMs: 3 * 60 * 1000,
    getIntervalMs: () => 10_000,
    shouldContinue: () => true,
    onTimeoutMessage:
      'Webhook updates are delayed. Please refresh later or try again in a few minutes.'
  }
} satisfies Record<string, PollingProfile>;

export function makeRefetchInterval(
  profile: PollingProfile,
  getElapsedMs: () => number,
  getData: () => unknown
) {
  return () => {
    const elapsedMs = getElapsedMs();
    if (elapsedMs >= profile.maxDurationMs) return false;

    const data = getData();
    if (!profile.shouldContinue(data)) return false;

    const interval = profile.getIntervalMs(elapsedMs);
    return interval === false ? false : interval;
  };
}
