'use client';

import type { ReactNode } from 'react';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useEffect, useMemo, useState } from 'react';
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
import { getAuthToken, getAuthUser, setAuthNotice } from '@/lib/auth';
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
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasToken = Boolean(getAuthToken());
  const normalizedError = error ? normalizeApiError(error) : null;
  const status = normalizedError?.status;
  const isUnauthorized = status === 401 || status === 404;
  const isForbidden = status === 403;
  const storedUser = useMemo(() => getAuthUser(), []);
  const destination = getPortalDestination(user ?? storedUser);
  const hasAllowedRole = allowRoles.length === 0 || allowRoles.includes(user?.role as UserRole);
  const hasAllowedScope =
    anyScopes.length === 0 || (user ? anyScopes.some((scope) => hasScope(user, scope)) : false);
  const needsPortalRedirect =
    Boolean(user) &&
    (!hasAllowedRole || !hasAllowedScope) &&
    Boolean(destination) &&
    Boolean(pathname) &&
    !pathname.startsWith(destination?.path ?? '');

  useEffect(() => {
    const token = getAuthToken();

    if (!token && !isLoading) {
      setAuthNotice({ message: SESSION_EXPIRED_MESSAGE, variant: 'error' });
      resetSession(getQueryClient());
      return;
    }

    if (isUnauthorized) {
      setAuthNotice({ message: SESSION_EXPIRED_MESSAGE, variant: 'error' });
      resetSession(getQueryClient());
      return;
    }

    if (isForbidden && destination && pathname && !pathname.startsWith(destination.path)) {
      setIsRedirecting(true);
      setAuthNotice({
        message: `Portée insuffisante pour cette page. Vous êtes connecté en tant que ${destination.label}. Redirection vers votre espace.`,
        variant: 'info'
      });
      router.replace(destination.path as Route);
    }
  }, [destination, isForbidden, isLoading, isUnauthorized, pathname, router]);

  useEffect(() => {
    if (!needsPortalRedirect || !destination) return;
    setIsRedirecting(true);
    setAuthNotice({
      message: `Vous êtes connecté en tant que ${destination.label}. Redirection vers votre espace.`,
      variant: 'info'
    });
    router.replace(destination.path as Route);
  }, [destination, needsPortalRedirect, router]);

  if (isLoading || isRedirecting || (!hasToken && !isLoading)) {
    return <LoadingState label={loadingLabel ?? 'Chargement...'} />;
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

  if (!user || !hasAllowedRole || !hasAllowedScope) {
    if (destination) {
      return <LoadingState label="Redirection..." />;
    }

    return (
      <div className="p-4">
        <ErrorAlert message={unauthorizedMessage} />
      </div>
    );
  }

  return <>{typeof children === 'function' ? children(user) : children}</>;
}
