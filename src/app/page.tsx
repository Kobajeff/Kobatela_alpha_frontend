'use client';

// Landing page redirects users to the correct dashboard based on authentication.
import { useEffect } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { useAuthMe } from '@/lib/queries/sender';
import { AuthUser } from '@/types/api';
import { extractErrorMessage, isUnauthorizedError } from '@/lib/apiClient';
import { ErrorAlert } from '@/components/common/ErrorAlert';

const adminDashboardPath = ['', 'admin', 'dashboard'].join('/');
const senderDashboardPath = ['', 'sender', 'dashboard'].join('/');

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useAuthMe();
  const user = data as AuthUser | undefined;
  const isUnauthorized = isError && isUnauthorizedError(error);

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
      router.replace('/login');
    } else if (user?.role === 'admin') {
      router.replace(adminDashboardPath as Route);
    } else if (user?.role) {
      router.replace(senderDashboardPath as Route);
    }
  }, [isUnauthorized, router, user]);

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
