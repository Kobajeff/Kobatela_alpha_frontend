import axios from 'axios';

export type NormalizedApiError = {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
};

type ErrorPayload = {
  error?: { message?: string; code?: string; details?: unknown };
  message?: string;
  code?: string;
  detail?: unknown;
  status?: number;
};

const DEFAULT_ERROR_MESSAGE = 'Une erreur est survenue';

const formatValidationErrors = (
  detail: Array<{ loc?: Array<string | number>; msg?: string }>
): string => {
  const parts = detail
    .map((item) => {
      const location = item.loc?.length ? item.loc.join('.') : 'Erreur';
      return item.msg ? `${location}: ${item.msg}` : location;
    })
    .filter(Boolean);

  return parts.length ? parts.join(' ; ') : DEFAULT_ERROR_MESSAGE;
};

const normalizeFromPayload = (
  payload: ErrorPayload | undefined,
  status?: number
): NormalizedApiError | null => {
  if (!payload) return null;

  if (payload.error?.message) {
    return {
      status,
      code: payload.error.code,
      message: payload.error.message,
      details: payload.error.details
    };
  }

  if (payload.message) {
    return {
      status,
      code: payload.code,
      message: payload.message,
      details: payload
    };
  }

  if (typeof payload.detail === 'string') {
    return { status, message: payload.detail, details: payload.detail };
  }

  if (
    typeof payload.detail === 'object' &&
    payload.detail !== null &&
    'message' in payload.detail
  ) {
    const detail = payload.detail as { message?: string; code?: string };
    if (detail.message) {
      return {
        status,
        code: detail.code,
        message: detail.message,
        details: payload.detail
      };
    }
  }

  if (Array.isArray(payload.detail)) {
    return {
      status,
      message: formatValidationErrors(payload.detail),
      details: payload.detail
    };
  }

  return null;
};

export function normalizeApiError(err: unknown): NormalizedApiError {
  let status: number | undefined;
  let payload: ErrorPayload | undefined;

  if (axios.isAxiosError(err)) {
    status = err.response?.status;
    payload = err.response?.data as ErrorPayload | undefined;
  } else if (err && typeof err === 'object') {
    const maybeError = err as ErrorPayload & { response?: { status?: number; data?: ErrorPayload } };
    status = maybeError.status ?? maybeError.response?.status;
    payload = maybeError.response?.data ?? maybeError;
  }

  const normalized = normalizeFromPayload(payload, status);
  const baseMessage =
    normalized?.message ??
    (err instanceof Error ? err.message : undefined) ??
    DEFAULT_ERROR_MESSAGE;

  const baseError: NormalizedApiError = {
    status,
    code: normalized?.code,
    message: baseMessage,
    details: normalized?.details
  };

  if (status === 405) {
    return { ...baseError, message: 'Méthode non autorisée' };
  }

  if (status === 401) {
    return { ...baseError, message: 'Accès non autorisé' };
  }

  if (status === 403) {
    if (baseError.code === 'INSUFFICIENT_SCOPE') {
      return { ...baseError, message: 'Action non autorisée' };
    }
    return { ...baseError, message: 'Accès non autorisé' };
  }

  if (status && status >= 500) {
    return { ...baseError, message: 'Une erreur est survenue côté serveur' };
  }

  if (normalized) {
    return baseError;
  }

  return baseError;
}

export function isInsufficientScope(error: NormalizedApiError): boolean {
  return error.status === 403 && error.code === 'INSUFFICIENT_SCOPE';
}

export function isAuthExpired(error: NormalizedApiError): boolean {
  return error.status === 401;
}

export function isDomainForbidden(error: NormalizedApiError): boolean {
  if (error.status !== 403 || !error.code) return false;
  return error.code.startsWith('NOT_') || error.code.endsWith('_FORBIDDEN');
}
