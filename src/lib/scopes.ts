import type { AuthUser } from '@/types/auth';

export function normalizeScopeValue(scope: string): string {
  return scope.trim().replace(/\s+/g, '_').toUpperCase();
}

export function normalizeScopeList(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : raw
        .split(/[,\s]+/)
        .map((value) => value.trim())
        .filter(Boolean);

  return list.map(normalizeScopeValue);
}

export function buildScopeSetFromUser(user: AuthUser | undefined): Set<string> {
  if (!user) return new Set<string>();

  return new Set<string>([
    ...normalizeScopeList(user.scopes),
    ...normalizeScopeList(user.api_scopes),
    ...normalizeScopeList(user.scope),
    ...normalizeScopeList(Array.isArray(user.permissions) ? user.permissions : [])
  ]);
}

export function userHasScope(user: AuthUser | undefined, scope: string): boolean {
  const scopeSet = buildScopeSetFromUser(user);
  return scopeSet.has(normalizeScopeValue(scope));
}

export function userHasAnyScope(user: AuthUser | undefined, scopes: string[]): boolean {
  if (!scopes.length) return true;
  const scopeSet = buildScopeSetFromUser(user);
  return scopes.some((scope) => scopeSet.has(normalizeScopeValue(scope)));
}
