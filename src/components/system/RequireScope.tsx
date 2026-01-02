'use client';

import type { ReactNode } from 'react';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthMe } from '@/lib/queries/sender';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import {
  getPortalDestination,
  hasScope,
  type NormalizedAuthUser
} from '@/lib/authIdentity';
import { getAuthToken, getAuthTokenEventName, setAuthNotice } from '@/lib/auth';
import { getQueryClient } from '@/lib/queryClient';
import { resetSession } from '@/lib/sessionReset';
import type { UserRole } from '@/types/api';

type RequireScopeProps = {
  anyScopes?: string[];
  allowRoles?: UserRole[];
  loadingLabel?: string;
  unauthorizedMessage?: string;
  children: ReactNode | ((user: NormalizedAuthUser) => ReactNode);
};

const DEFAULT_UNAUTHORIZED_MESSAGE = 'Portée insuffisante pour cette page.';
const SESSION_EXPIRED_MESSAGE = 'Session expirée. Veuillez vous reconnecter.';

export function RequireScope({
  anyScopes = [],
  allowRoles = [],
  loadingLabel,
  unauthorizedMessage = DEFAULT_UNAUTHORIZED_MESSAGE,
  children
}: RequireScopeProps) {
  const { data: user, isLoading, isError, error } = useAuthMe();
  const router = useRouter();
  const pathname = usePathname();
  const didResetRef = useRef(false);
  const didRedirectRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const normalizedError = error ? normalizeApiError(error) : null;
  const status = normalizedError?.status;
  const isUnauthorized = status === 401 || status === 404;
  const isForbidden = status === 403;
  const destination = getPortalDestination(user ?? null);
  const destinationPath = destination?.path;
  const hasAllowedRole = allowRoles.length === 0 || allowRoles.includes(user?.role as UserRole);
  const hasAllowedScope =
    anyScopes.length === 0 || (user ? anyScopes.some((scope) => hasScope(user, scope)) : false);
  const isAtDestination =
    typeof destinationPath === 'string' &&
    typeof pathname === 'string' &&
    pathname.startsWith(destinationPath);
  const needsPortalRedirect =
    Boolean(user) &&
    (!hasAllowedRole || !hasAllowedScope) &&
    Boolean(destinationPath) &&
    Boolean(pathname) &&
    !isAtDestination;
  const shouldPortalRedirect =
    mounted &&
    hasToken &&
    Boolean(user) &&
    Boolean(destinationPath) &&
    Boolean(pathname) &&
    !isAtDestination &&
    (isForbidden || needsPortalRedirect);

  useEffect(() => {
    setMounted(true);

    const updateTokenState = () => {
      setHasToken(Boolean(getAuthToken()));
    };

    updateTokenState();

    const tokenEventName = getAuthTokenEventName();
    window.addEventListener(tokenEventName, updateTokenState);
    window.addEventListener('storage', updateTokenState);
    return () => {
      window.removeEventListener(tokenEventName, updateTokenState);
      window.removeEventListener('storage', updateTokenState);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!hasToken && !isLoading) {
      if (didResetRef.current) return;
      didResetRef.current = true;
      setAuthNotice({ message: SESSION_EXPIRED_MESSAGE, variant: 'error' });
      resetSession(getQueryClient());
      return;
    }

    if (isUnauthorized) {
      if (didResetRef.current) return;
      didResetRef.current = true;
      setAuthNotice({ message: SESSION_EXPIRED_MESSAGE, variant: 'error' });
      resetSession(getQueryClient());
      return;
    }

    if (shouldPortalRedirect && destination) {
      if (didRedirectRef.current) return;
      didRedirectRef.current = true;
      setAuthNotice({
        message: isForbidden
          ? `Portée insuffisante pour cette page. Vous êtes connecté en tant que ${destination.label}. Redirection vers votre espace.`
          : `Vous êtes connecté en tant que ${destination.label}. Redirection vers votre espace.`,
        variant: 'info'
      });
      router.replace(destination.path as Route);
    }
  }, [
    destination,
    hasToken,
    isForbidden,
    isLoading,
    isUnauthorized,
    mounted,
    pathname,
    router,
    shouldPortalRedirect
  ]);

  if (process.env.NODE_ENV === 'development') {
    const rawScopes = user?.scopes;
    const rawApiScopes = user?.api_scopes;
    const rawPermissions = user?.permissions;
    const rawScope = user?.scope;
    const scopeList = Array.isArray(user?.normalizedScopes) ? user.normalizedScopes : [];
    console.debug('[RequireScope]', {
      pathname,
      hasToken,
      isLoading,
      status,
      role: user?.role,
      scopes: {
        scopesCount: Array.isArray(rawScopes) ? rawScopes.length : rawScopes ? 1 : 0,
        apiScopesCount: Array.isArray(rawApiScopes) ? rawApiScopes.length : rawApiScopes ? 1 : 0,
        permissionsCount: Array.isArray(rawPermissions)
          ? rawPermissions.length
          : rawPermissions
            ? 1
            : 0,
        scopeValue: rawScope,
        normalizedCount: scopeList.length,
        sample: scopeList.slice(0, 3)
      },
      hasAllowedRole,
      hasAllowedScope,
      destinationPath: destination?.path
    });
  }

  if (!mounted) {
    return <LoadingState label="Loading…" />;
  }

  if (isLoading || (!hasToken && !isLoading)) {
    return <LoadingState label={loadingLabel ?? 'Loading…'} />;
  }

  if (isError && isUnauthorized) {
    return (
      <div className="p-4">
        <ErrorAlert message={SESSION_EXPIRED_MESSAGE} />
      </div>
    );
  }

  if (isError && isForbidden) {
    return (
      <div className="p-4">
        <ErrorAlert message={unauthorizedMessage} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  if (user && hasAllowedRole && hasAllowedScope) {
    return <>{typeof children === 'function' ? children(user) : children}</>;
  }

  if (shouldPortalRedirect) {
    return <LoadingState label="Redirection…" />;
  }

  if (!user || !hasAllowedRole || !hasAllowedScope) {
    return (
      <div className="p-4">
        <ErrorAlert message={unauthorizedMessage} />
      </div>
    );
  }
  return <>{typeof children === 'function' ? children(user) : children}</>;
}
