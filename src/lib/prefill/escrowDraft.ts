const STORAGE_KEY = 'kobatela:escrowDraft';
const TTL_MINUTES = 30;

export type EscrowDraftPrefill = {
  source: 'mandate';
  mandate_id: string | number;
  created_at: string;
  expires_at: string;
  payload: Record<string, unknown>;
};

const isBrowser = () => typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';

export const buildEscrowDraftFromMandate = (mandate: Record<string, unknown>) => {
  const payload: Record<string, unknown> = {};
  const totalAmount = mandate.total_amount ?? mandate.totalAmount;
  if (typeof totalAmount === 'number') {
    payload.amount = totalAmount.toString();
  } else if (typeof totalAmount === 'string') {
    payload.amount = totalAmount;
  }

  const currency = mandate.currency;
  if (typeof currency === 'string') {
    payload.currency = currency;
  }

  return payload;
};

export const setEscrowDraft = (prefill: EscrowDraftPrefill) => {
  if (!isBrowser()) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefill));
};

export const clearEscrowDraft = () => {
  if (!isBrowser()) return;
  sessionStorage.removeItem(STORAGE_KEY);
};

export const getEscrowDraft = (): EscrowDraftPrefill | null => {
  if (!isBrowser()) return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as EscrowDraftPrefill;
    if (!parsed?.expires_at) {
      clearEscrowDraft();
      return null;
    }
    const expiresAt = new Date(parsed.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      clearEscrowDraft();
      return null;
    }
    return parsed;
  } catch (_error) {
    clearEscrowDraft();
    return null;
  }
};

export const createEscrowDraftFromMandate = (mandate: { id?: string | number } & Record<string, unknown>) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MINUTES * 60 * 1000);
  return {
    source: 'mandate' as const,
    mandate_id: mandate.id ?? 'unknown',
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    payload: buildEscrowDraftFromMandate(mandate)
  };
};
