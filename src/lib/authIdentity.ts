'use client';

import type { AuthMeResponse, AuthUser, EffectiveScope, GlobalRole } from '@/types/auth';
import { normalizeScopeList, normalizeScopeValue, userHasAnyScope } from './scopes';
import { getPortalMode } from './portalMode';

export const PORTAL_PATHS = {
  admin: ['', 'admin', 'dashboard'].join('/'),
  advisor: ['', 'advisor', 'queue'].join('/'),
  sender: ['', 'sender', 'dashboard'].join('/'),
  provider: ['', 'provider', 'dashboard'].join('/')
} as const;

export type PortalDestination = {
  path: string;
  label: string;
};

export type NormalizedAuthUser = AuthUser & {
  userId: string | number;
  globalRole: GlobalRole;
  effectiveScopes: EffectiveScope[];
  scopeList: string[];
  normalizedScopes: string[];
};

export type AuthIdentity = {
  userId: string | number;
  scopes: string[];
  globalRole: GlobalRole;
  raw: AuthUser;
};

function getUserId(user: AuthUser): string | number {
  const candidate = (user as { user_id?: string | number }).user_id;
  return candidate ?? user.id;
}

export function normalizeAuthUser(user: AuthUser): NormalizedAuthUser {
  const normalizedRole =
    typeof user.role === 'string' ? (user.role.toLowerCase() as GlobalRole) : user.role;
  const effectiveScopes = normalizeScopeList(user.scopes);
  const scopeList = [
    ...effectiveScopes,
    ...normalizeScopeList(user.api_scopes),
    ...normalizeScopeList(user.scope),
    ...normalizeScopeList(Array.isArray(user.permissions) ? user.permissions : [])
  ];
  const normalizedScopes = Array.from(new Set(scopeList.map((scope) => normalizeScopeValue(scope))));
  const normalizedEffectiveScopes = Array.from(
    new Set(effectiveScopes.map((scope) => normalizeScopeValue(scope)))
  );

  return {
    ...user,
    role: normalizedRole,
    globalRole: normalizedRole,
    effectiveScopes: normalizedEffectiveScopes,
    userId: getUserId(user),
    scopeList: normalizedEffectiveScopes,
    normalizedScopes
  };
}

export function normalizeAuthMe(response: AuthMeResponse): AuthIdentity {
  const normalized = normalizeAuthUser(response.user);
  return {
    userId: normalized.userId,
    scopes: normalized.effectiveScopes,
    globalRole: normalized.globalRole,
    raw: normalized
  };
}

export function hasScope(user: AuthUser | undefined, scope: string): boolean {
  return userHasAnyScope(user, [scope]);
}

function getEffectiveScopes(user: AuthUser | NormalizedAuthUser): string[] {
  if ('effectiveScopes' in user && Array.isArray(user.effectiveScopes)) {
    return user.effectiveScopes.map((scope) => normalizeScopeValue(scope));
  }
  return normalizeScopeList(user.scopes).map((scope) => normalizeScopeValue(scope));
}

function getRoleLabel(role?: GlobalRole | string): string | null {
  switch (role) {
    case 'admin':
      return 'administrateur';
    case 'support':
      return 'support';
    case 'advisor':
      return 'conseiller';
    case 'user':
      return 'utilisateur';
    default:
      return null;
  }
}

export function getPortalDestination(
  user?: AuthUser | NormalizedAuthUser | null,
  portalModeOverride?: 'sender' | 'provider'
): PortalDestination | null {
  if (!user) return null;

  const scopes = getEffectiveScopes(user);
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

  const portalMode = portalModeOverride ?? getPortalMode();
  if (portalMode === 'provider') {
    return { path: PORTAL_PATHS.provider, label: 'prestataire' };
  }

  return { path: PORTAL_PATHS.sender, label: roleLabel ?? 'expéditeur' };

}

function isAdminOrSupportRole(role?: GlobalRole | string | null): boolean {
  if (!role) return false;
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;
  return normalizedRole === 'admin' || normalizedRole === 'support';
}

function hasAdminOrSupportScope(user?: AuthUser | NormalizedAuthUser | null): boolean {
  const scopes = user ? getEffectiveScopes(user) : [];
  return scopes.includes(normalizeScopeValue('ADMIN')) || scopes.includes(normalizeScopeValue('SUPPORT'));
}

export function canViewOpsPaymentFields(user?: AuthUser | NormalizedAuthUser | null): boolean {
  return isAdminOrSupportRole(user?.role) || hasAdminOrSupportScope(user);
}

export function canViewSensitiveProofFields(user?: AuthUser | NormalizedAuthUser | null): boolean {
  return canViewOpsPaymentFields(user);
}
