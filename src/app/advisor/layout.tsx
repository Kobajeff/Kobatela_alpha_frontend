'use client';

// Layout guarding advisor routes and providing advisor chrome.
import { useEffect } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { AdvisorShell } from '@/components/layout/AdvisorShell';
import { extractErrorMessage, isUnauthorizedError } from '@/lib/apiClient';
import { useAuthMe } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { AuthUser } from '@/types/api';

const adminDashboardPath = ['', 'admin', 'dashboard'].join('/');
const senderDashboardPath = ['', 'sender', 'dashboard'].join('/');

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
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
      if (user.role === 'admin' || user.role === 'both' || user.role === 'support') {
        router.replace(adminDashboardPath as Route);
      } else if (user.role === 'sender') {
        router.replace(senderDashboardPath as Route);
      } else if (user.role !== 'advisor') {
        router.replace('/login');
      }
    }
  }, [router, user]);

  if (isLoading) {
    return <LoadingState label="Vérification de l'accès conseiller..." />;
  }

  if (isError && !isUnauthorized) {
    return (
      <div className="p-4">
        <ErrorAlert message={extractErrorMessage(error)} />
      </div>
    );
  }

  if (isUnauthorized || !user || user.role !== 'advisor') {
    return null;
  }

  return <AdvisorShell>{children}</AdvisorShell>;
}
