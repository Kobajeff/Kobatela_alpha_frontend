'use client';

import type { ReactNode } from 'react';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useAuthMe } from '@/lib/queries/sender';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import type { NormalizedAuthUser } from '@/lib/authIdentity';
import { hasScope } from '@/lib/authIdentity';
import type { UserRole } from '@/types/api';

type RequireScopeProps = {
  anyScopes?: string[];
  allowRoles?: UserRole[];
  loadingLabel?: string;
  unauthorizedMessage?: string;
  children: ReactNode | ((user: NormalizedAuthUser) => ReactNode);
};

const DEFAULT_UNAUTHORIZED_MESSAGE =
  'Session invalide ou portée insuffisante. Merci de vous reconnecter.';

export function RequireScope({
  anyScopes = [],
  allowRoles = [],
  loadingLabel,
  unauthorizedMessage = DEFAULT_UNAUTHORIZED_MESSAGE,
  children
}: RequireScopeProps) {
  const { data: user, isLoading, isError, error } = useAuthMe();
  const normalizedError = error ? normalizeApiError(error) : null;
  const unauthorized =
    normalizedError?.status === 401 ||
    normalizedError?.status === 403 ||
    normalizedError?.status === 404;

  if (isLoading) {
    return <LoadingState label={loadingLabel ?? 'Chargement...'} />;
  }

  if (isError && unauthorized) {
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

  const hasAllowedRole = allowRoles.length === 0 || allowRoles.includes(user?.role as UserRole);
  const hasAllowedScope =
    anyScopes.length === 0 || (user ? anyScopes.some((scope) => hasScope(user, scope)) : false);

  if (!user || !hasAllowedRole || !hasAllowedScope) {
    return (
      <div className="p-4">
        <ErrorAlert message={unauthorizedMessage} />
      </div>
    );
  }

  return <>{typeof children === 'function' ? children(user) : children}</>;
}
