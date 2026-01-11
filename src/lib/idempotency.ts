const IDEMPOTENCY_STORAGE_PREFIX = 'idempotency:';

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idempotency_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getStoredIdempotencyKey(intent: string): string | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  return storage.getItem(`${IDEMPOTENCY_STORAGE_PREFIX}${intent}`);
}

export function getOrCreateIdempotencyKey(intent: string): string {
  const existing = getStoredIdempotencyKey(intent);
  if (existing) return existing;
  const nextKey = generateIdempotencyKey();
  const storage = getSessionStorage();
  if (storage) {
    storage.setItem(`${IDEMPOTENCY_STORAGE_PREFIX}${intent}`, nextKey);
  }
  return nextKey;
}

export function clearIdempotencyKey(intent: string) {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(`${IDEMPOTENCY_STORAGE_PREFIX}${intent}`);
}
