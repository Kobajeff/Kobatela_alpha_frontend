'use client';

// Layout guarding sender routes and wrapping them in the application shell.
import { useEffect } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { extractErrorMessage, isUnauthorizedError } from '@/lib/apiClient';
import { useAuthMe } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { AuthUser } from '@/types/api';
import { ErrorAlert } from '@/components/common/ErrorAlert';

const adminDashboardPath = ['', 'admin', 'dashboard'].join('/');

export default function SenderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading, error, isError } = useAuthMe();
  const user = data as AuthUser | undefined;
  const isUnauthorized = isError && isUnauthorizedError(error);

  useEffect(() => {
    if (isUnauthorized) {
      router.replace('/login');
    }
  }, [isUnauthorized, router]);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.replace(adminDashboardPath as Route);
      } else if (user.role !== 'sender' && user.role !== 'both') {
        router.replace('/login');
      }
    }
  }, [router, user]);

  if (isLoading) {
    return <LoadingState label="Chargement de votre espace expéditeur..." />;
  }

  if (isError && !isUnauthorized) {
    return (
      <div className="p-4">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  if (isUnauthorized || !user || (user.role !== 'sender' && user.role !== 'both')) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
