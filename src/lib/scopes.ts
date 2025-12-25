import type { AuthUser } from '@/types/api';

function normalizeScopeList(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.split(/[\\s,]+/).filter(Boolean);
}

export function userHasScope(user: AuthUser | undefined, scope: string): boolean {
  if (!user) return false;
  const scopes = new Set<string>([
    ...normalizeScopeList(user.scopes),
    ...normalizeScopeList(user.api_scopes),
    ...normalizeScopeList(user.scope),
    ...(Array.isArray(user.permissions) ? user.permissions : [])
  ]);
  return scopes.has(scope);
}
