export type NetworkErrorKind = 'server' | 'network';

type NetworkHealthSnapshot = {
  online: boolean;
  unstable: boolean;
  errorCount: number;
};

const ERROR_WINDOW_MS = 60_000;
const UNSTABLE_THRESHOLD = 3;
const DEDUPE_WINDOW_MS = 250;

let online = true;
let errorTimestamps: number[] = [];
let lastRecordedAt = 0;
let pruneTimeout: ReturnType<typeof setTimeout> | null = null;
let lastSnapshot: NetworkHealthSnapshot = {
  online,
  unstable: false,
  errorCount: 0
};

const listeners = new Set<() => void>();

const pruneErrors = (now: number) => {
  errorTimestamps = errorTimestamps.filter((timestamp) => now - timestamp <= ERROR_WINDOW_MS);
};

const emit = () => {
  listeners.forEach((listener) => listener());
};

const updateSnapshot = () => {
  const errorCount = errorTimestamps.length;
  const unstable = errorCount >= UNSTABLE_THRESHOLD;
  if (
    lastSnapshot.online === online &&
    lastSnapshot.unstable === unstable &&
    lastSnapshot.errorCount === errorCount
  ) {
    return lastSnapshot;
  }
  lastSnapshot = {
    online,
    unstable,
    errorCount
  };
  return lastSnapshot;
};

const schedulePrune = () => {
  if (pruneTimeout) {
    clearTimeout(pruneTimeout);
    pruneTimeout = null;
  }
  if (errorTimestamps.length === 0) {
    return;
  }
  const now = Date.now();
  const oldest = Math.min(...errorTimestamps);
  const delay = Math.max(oldest + ERROR_WINDOW_MS - now, 0);
  pruneTimeout = setTimeout(() => {
    pruneErrors(Date.now());
    emit();
    schedulePrune();
  }, delay);
};

export function recordNetworkError(_kind: NetworkErrorKind) {
  const now = Date.now();
  if (now - lastRecordedAt < DEDUPE_WINDOW_MS) {
    return;
  }
  lastRecordedAt = now;
  errorTimestamps = [...errorTimestamps, now];
  pruneErrors(now);
  emit();
  schedulePrune();
}

export function setOnline(nextOnline: boolean) {
  if (online === nextOnline) return;
  online = nextOnline;
  emit();
}

export function getSnapshot(): NetworkHealthSnapshot {
  return updateSnapshot();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
