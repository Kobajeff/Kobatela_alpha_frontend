'use client';

// Landing page redirects users to the correct dashboard based on authentication.
import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
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
  const { data, isLoading, isError, error } = useAuthMe();
  const destination = getPortalDestination(data);
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const normalizedError = error ? normalizeApiError(error) : null;
  const isUnauthorized = normalizedError?.status === 401 || normalizedError?.status === 404;
  const isForbidden = normalizedError?.status === 403;

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
      setIsRedirecting(true);
      router.replace('/login');
      return;
    }

    if (isUnauthorized) {
      setIsRedirecting(true);
      setAuthNotice({
        message: 'Session expirée. Veuillez vous reconnecter.',
        variant: 'error'
      });
      resetSession(getQueryClient());
      return;
    }

    if (isForbidden && destination) {
      setIsRedirecting(true);
      setAuthNotice({
        message: `Portée insuffisante pour cette page. Vous êtes connecté en tant que ${destination.label}. Redirection vers votre espace.`,
        variant: 'info'
      });
      router.replace(destination.path as Route);
      return;
    }

    if (destination) {
      setIsRedirecting(true);
      router.replace(destination.path as Route);
    }
  }, [destination, hasToken, isForbidden, isUnauthorized, mounted, router]);

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

  return (
    <LoadingState label={isRedirecting ? 'Redirection…' : 'Loading…'} />
  );
}
