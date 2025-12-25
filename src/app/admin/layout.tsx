'use client';

// Layout guarding admin routes and providing the admin chrome.
import { useEffect } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { extractErrorMessage, isUnauthorizedError } from '@/lib/apiClient';
import { useAuthMe } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { AuthUser } from '@/types/api';
import { ErrorAlert } from '@/components/common/ErrorAlert';

const senderDashboardPath = ['', 'sender', 'dashboard'].join('/');

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
      if (user.role === 'sender') {
        router.replace(senderDashboardPath as Route);
      } else if (user.role !== 'admin' && user.role !== 'both' && user.role !== 'support') {
        router.replace('/login');
      }
    }
  }, [router, user]);

  if (isLoading) {
    return <LoadingState label="Vérification de l'accès administrateur..." />;
  }

  if (isError && !isUnauthorized) {
    return (
      <div className="p-4">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  if (
    isUnauthorized ||
    !user ||
    (user.role !== 'admin' && user.role !== 'both' && user.role !== 'support')
  ) {
    return null;
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
