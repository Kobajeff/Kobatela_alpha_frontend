'use client';

// Landing page redirects users to the correct dashboard based on authentication.
import { useEffect } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { getAuthToken, setAuthNotice } from '@/lib/auth';
import { getPortalDestination } from '@/lib/authIdentity';
import { useAuthMe } from '@/lib/queries/sender';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { resetSession } from '@/lib/sessionReset';
import { getQueryClient } from '@/lib/queryClient';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useAuthMe();
  const destination = getPortalDestination(data);
  const normalizedError = error ? normalizeApiError(error) : null;
  const isUnauthorized = normalizedError?.status === 401 || normalizedError?.status === 404;
  const isForbidden = normalizedError?.status === 403;

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    if (isUnauthorized) {
      setAuthNotice({
        message: 'Session expirée. Veuillez vous reconnecter.',
        variant: 'error'
      });
      resetSession(getQueryClient());
      return;
    }

    if (isForbidden && destination) {
      setAuthNotice({
        message: `Portée insuffisante pour cette page. Vous êtes connecté en tant que ${destination.label}. Redirection vers votre espace.`,
        variant: 'info'
      });
      router.replace(destination.path as Route);
      return;
    }

    if (destination) {
      router.replace(destination.path as Route);
    }
  }, [destination, isForbidden, isUnauthorized, router]);

  if (isError && !isUnauthorized) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      {isLoading ? 'Loading...' : 'Redirection...'}
    </div>
  );
}
