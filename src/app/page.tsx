'use client';

// Landing page redirects users to the correct dashboard based on authentication.
import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { getAuthToken, getAuthTokenEventName, setAuthNotice } from '@/lib/auth';
import { getPortalDestination } from '@/lib/authIdentity';
import { useAuthMe } from '@/lib/queries/sender';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { resetSession } from '@/lib/sessionReset';
import { getQueryClient } from '@/lib/queryClient';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError, error } = useAuthMe();
  const destination = getPortalDestination(user);
  const destinationPath = destination?.path;
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const didRedirectRef = useRef(false);
  const didResetRef = useRef(false);
  const normalizedError = error ? normalizeApiError(error) : null;
  const isUnauthorized = normalizedError?.status === 401 || normalizedError?.status === 404;
  const isForbidden = normalizedError?.status === 403;
  const isAtDestination =
    typeof destinationPath === 'string' &&
    typeof pathname === 'string' &&
    pathname.startsWith(destinationPath);

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

    if (!hasToken) {
      if (didRedirectRef.current) return;
      didRedirectRef.current = true;
      router.replace('/login');
      return;
    }

    if (isUnauthorized) {
      if (didResetRef.current) return;
      didResetRef.current = true;
      setAuthNotice({
        message: 'Session expirée. Veuillez vous reconnecter.',
        variant: 'error'
      });
      resetSession(getQueryClient());
      return;
    }

    if (!user || !destination?.path || isAtDestination) return;

    if (didRedirectRef.current) return;
    didRedirectRef.current = true;

    if (isForbidden) {
      setAuthNotice({
        message: `Portée insuffisante pour cette page. Vous êtes connecté en tant que ${destination.label}. Redirection vers votre espace.`,
        variant: 'info'
      });
    }

    router.replace(destination.path as Route);
  }, [
    destination,
    isUnauthorized,
    mounted,
    router,
    hasToken,
    isAtDestination,
    isForbidden,
    user
  ]);

  if (!mounted) {
    return <LoadingState label="Loading…" />;
  }

  if (!hasToken) {
    return <LoadingState label="Redirection…" />;
  }

  if (isError && !isUnauthorized) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  if (isLoading || !user) {
    return <LoadingState label="Loading…" />;
  }

  if (!destination?.path) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorAlert message="Impossible de déterminer votre espace." />
      </div>
    );
  }

  return <LoadingState label="Redirection…" />;
}
