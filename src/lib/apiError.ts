import axios from 'axios';
import { getApiErrorMessage } from './errorMessages';

export type NormalizedApiError = {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
  raw?: unknown;
};

type ErrorPayload = {
  error?: { message?: string; code?: string; details?: unknown };
  message?: string;
  code?: string;
  detail?: unknown;
  status?: number;
};

const DEFAULT_ERROR_MESSAGE = 'Une erreur est survenue.';

const formatValidationErrors = (
  detail: Array<{ loc?: Array<string | number>; msg?: string }>
): string => {
  if (!detail.length) return DEFAULT_ERROR_MESSAGE;
  const first = detail[0]?.msg ?? 'Validation error';
  const remaining = detail.length - 1;
  const suffix = remaining > 0 ? ` (+${remaining})` : '';
  return `Validation error: ${first}${suffix}`;
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

  if (
    typeof payload.detail === 'object' &&
    payload.detail !== null &&
    'message' in payload.detail
  ) {
    const detail = payload.detail as { message?: string; code?: string; details?: unknown };
    if (detail.message) {
      return {
        status,
        code: detail.code,
        message: detail.message,
        details: detail.details ?? payload.detail
      };
    }
  }

  if (typeof payload.detail === 'string') {
    return { status, message: payload.detail, details: payload.detail };
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
    details: normalized?.details,
    raw: undefined
  };

  const mappedMessage = getApiErrorMessage(baseError);
  if (mappedMessage) {
    return { ...baseError, message: mappedMessage };
  }

  if (status && status >= 500) {
    return { ...baseError, message: 'Une erreur est survenue côté serveur.' };
  }

  return baseError;
}

export function isUnauthorized(error: NormalizedApiError): boolean {
  return error.status === 401;
}

export function isForbidden(error: NormalizedApiError): boolean {
  return error.status === 403;
}

export function isNotFound(error: NormalizedApiError): boolean {
  return error.status === 404;
}

export function isGone(error: NormalizedApiError): boolean {
  return error.status === 410;
}

export function isInsufficientScope(error: NormalizedApiError): boolean {
  return error.status === 403 && error.code === 'INSUFFICIENT_SCOPE';
}

export function isConflict(error: NormalizedApiError): boolean {
  return error.status === 409;
}

export function isValidation(error: NormalizedApiError): boolean {
  return error.status === 422 || error.status === 400;
}
