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

const listeners = new Set<() => void>();

const pruneErrors = (now: number) => {
  errorTimestamps = errorTimestamps.filter((timestamp) => now - timestamp <= ERROR_WINDOW_MS);
};

const emit = () => {
  listeners.forEach((listener) => listener());
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
}

export function setOnline(nextOnline: boolean) {
  if (online === nextOnline) return;
  online = nextOnline;
  emit();
}

export function getSnapshot(): NetworkHealthSnapshot {
  const now = Date.now();
  pruneErrors(now);
  const errorCount = errorTimestamps.length;
  return {
    online,
    unstable: errorCount >= UNSTABLE_THRESHOLD,
    errorCount
  };
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
