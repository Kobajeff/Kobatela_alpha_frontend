'use client';

// Layout guarding admin routes and providing the admin chrome.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { isUnauthorizedError } from '@/lib/apiClient';
import { useAuthMe } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { AuthUser } from '@/types/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading, error, isError } = useAuthMe();
  const user = data as AuthUser | undefined;
  const isUnauthorized = isError && isUnauthorizedError(error);

  useEffect(() => {
    if (isUnauthorized || (isError && !isUnauthorized)) {
      router.replace('/login');
    }
  }, [isError, isUnauthorized, router]);

  useEffect(() => {
    if (user) {
      if (user.role === 'sender') {
        router.replace('/sender');
      } else if (user.role !== 'admin' && user.role !== 'both') {
        router.replace('/login');
      }
    }
  }, [router, user]);

  if (isLoading) {
    return <LoadingState label="Vérification de l'accès administrateur..." />;
  }

  if (isUnauthorized || !user || (user.role !== 'admin' && user.role !== 'both')) {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}
