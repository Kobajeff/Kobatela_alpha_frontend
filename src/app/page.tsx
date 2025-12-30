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
  const { data, isLoading, isError, error } = useAuthMe();
  const destination = getPortalDestination(data);
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const didRedirectRef = useRef(false);
  const didResetRef = useRef(false);
  const normalizedError = error ? normalizeApiError(error) : null;
  const isUnauthorized = normalizedError?.status === 401 || normalizedError?.status === 404;
  const isForbidden = normalizedError?.status === 403;
  const isAtDestination =
    Boolean(destination?.path) && Boolean(pathname) && pathname.startsWith(destination.path);
  const shouldRedirectToLogin = mounted && !hasToken;
  const shouldRedirectToPortal =
    mounted && hasToken && Boolean(destination?.path) && !isAtDestination;
  const shouldRedirectForForbidden =
    mounted && isForbidden && Boolean(destination?.path) && !isAtDestination;
  const shouldRedirect =
    shouldRedirectToLogin || shouldRedirectToPortal || shouldRedirectForForbidden;

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

    if (!shouldRedirect || didRedirectRef.current) return;
    didRedirectRef.current = true;

    if (shouldRedirectToLogin) {
      router.replace('/login');
      return;
    }

    if (shouldRedirectForForbidden && destination) {
      setAuthNotice({
        message: `Portée insuffisante pour cette page. Vous êtes connecté en tant que ${destination.label}. Redirection vers votre espace.`,
        variant: 'info'
      });
      router.replace(destination.path as Route);
      return;
    }

    if (shouldRedirectToPortal && destination) {
      router.replace(destination.path as Route);
    }
  }, [
    destination,
    isUnauthorized,
    mounted,
    router,
    shouldRedirect,
    shouldRedirectForForbidden,
    shouldRedirectToLogin,
    shouldRedirectToPortal
  ]);

  if (!mounted) {
    return <LoadingState label="Loading…" />;
  }

  if (isError && !isUnauthorized) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  return <LoadingState label={shouldRedirect ? 'Redirection…' : 'Loading…'} />;
}
