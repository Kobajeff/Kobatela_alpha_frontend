'use client';

import type { AuthMeResponse, AuthUser, UserRole } from '@/types/api';
import { normalizeScopeList, normalizeScopeValue, userHasAnyScope } from './scopes';

const PORTAL_PATHS = {
  admin: '/admin/dashboard',
  advisor: '/advisor/queue',
  sender: '/sender/dashboard',
  provider: '/provider/dashboard'
} as const;

export type PortalDestination = {
  path: string;
  label: string;
};

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

function getNormalizedScopes(user: AuthUser | NormalizedAuthUser): string[] {
  if ('normalizedScopes' in user && Array.isArray(user.normalizedScopes)) {
    return user.normalizedScopes;
  }
  return [
    ...normalizeScopeList(user.scopes),
    ...normalizeScopeList(user.api_scopes),
    ...normalizeScopeList(user.scope),
    ...normalizeScopeList(Array.isArray(user.permissions) ? user.permissions : [])
  ];
}

function getRoleLabel(role?: UserRole | string): string | null {
  switch (role) {
    case 'admin':
      return 'administrateur';
    case 'support':
      return 'support';
    case 'advisor':
      return 'conseiller';
    case 'sender':
      return 'expéditeur';
    case 'both':
      return 'expéditeur';
    default:
      return null;
  }
}

export function getPortalDestination(
  user?: AuthUser | NormalizedAuthUser | null
): PortalDestination | null {
  if (!user) return null;

  const scopes = getNormalizedScopes(user);
  const roleLabel = getRoleLabel(user.role);
  const hasScope = (scope: string) => scopes.includes(normalizeScopeValue(scope));

  if (
    user.role === 'admin' ||
    user.role === 'support' ||
    hasScope('ADMIN') ||
    hasScope('SUPPORT') ||
    hasScope('PRICING_ADMIN') ||
    hasScope('RISK_ADMIN')
  ) {
    return { path: PORTAL_PATHS.admin, label: roleLabel ?? 'administrateur' };
  }

  if (user.role === 'advisor' || hasScope('ADVISOR')) {
    return { path: PORTAL_PATHS.advisor, label: roleLabel ?? 'conseiller' };
  }

  if (user.role === 'sender' || user.role === 'both' || hasScope('SENDER')) {
    return { path: PORTAL_PATHS.sender, label: roleLabel ?? 'expéditeur' };
  }

  if (hasScope('PROVIDER')) {
    return { path: PORTAL_PATHS.provider, label: 'prestataire' };
  }

  return null;
}
