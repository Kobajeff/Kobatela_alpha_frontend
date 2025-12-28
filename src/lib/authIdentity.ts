'use client';

import type { AuthMeResponse, AuthUser, UserRole } from '@/types/api';
import { normalizeScopeList, normalizeScopeValue, userHasAnyScope } from './scopes';

export type NormalizedAuthUser = AuthUser & {
  userId: string | number;
  scopeList: string[];
  normalizedScopes: string[];
};

export type AuthIdentity = {
  userId: string | number;
  scopes: string[];
  role?: UserRole;
  raw: AuthUser;
};

function getUserId(user: AuthUser): string | number {
  const candidate = (user as { user_id?: string | number }).user_id;
  return candidate ?? user.id;
}

export function normalizeAuthUser(user: AuthUser): NormalizedAuthUser {
  const scopeList = [
    ...normalizeScopeList(user.scopes),
    ...normalizeScopeList(user.api_scopes),
    ...normalizeScopeList(user.scope),
    ...normalizeScopeList(Array.isArray(user.permissions) ? user.permissions : [])
  ];
  const normalizedScopes = Array.from(
    new Set(scopeList.map((scope) => normalizeScopeValue(scope)))
  );

  return {
    ...user,
    userId: getUserId(user),
    scopeList: normalizedScopes,
    normalizedScopes
  };
}

export function normalizeAuthMe(response: AuthMeResponse): AuthIdentity {
  const normalized = normalizeAuthUser(response.user);
  return {
    userId: normalized.userId,
    scopes: normalized.normalizedScopes,
    role: normalized.role,
    raw: normalized
  };
}

export function hasScope(user: AuthUser | undefined, scope: string): boolean {
  return userHasAnyScope(user, [scope]);
}
