'use client';

/**
 * Helpers for handling external beneficiary tokens without leaking them.
 *
 * Token transport contract (docs/Backend_info/API_GUIDE (11).md):
 * - Preferred header: Authorization: Bearer <token>
 * - Optional header: X-External-Token: <token>
 * - Legacy (avoid): ?token=<token>
 */
import {
  clearExternalToken,
  consumeExternalTokenFromQuery,
  getExternalToken,
  setExternalToken
} from './external/externalSession';

export const getExternalTokenFromUrl = consumeExternalTokenFromQuery;
export const getExternalTokenFromStorage = getExternalToken;
export const persistExternalToken = setExternalToken;
export const clearExternalTokenFromStorage = clearExternalToken;

export function buildExternalAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'X-External-Token': token
  };
}
