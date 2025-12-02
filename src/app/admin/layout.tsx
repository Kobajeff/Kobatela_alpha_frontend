'use client';

// Layout guarding admin routes and providing the admin chrome.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { isUnauthorizedError } from '@/lib/apiClient';
import { useAuthMe } from '@/lib/queries/sender';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading, error, isError } = useAuthMe();
  const isUnauthorized = isError && isUnauthorizedError(error);

  useEffect(() => {
    if (isUnauthorized || (isError && !isUnauthorized)) {
      router.replace('/login');
    }
  }, [isError, isUnauthorized, router]);

  useEffect(() => {
    if (data) {
      if (data.role === 'sender') {
        router.replace('/sender/dashboard');
      } else if (data.role !== 'admin' && data.role !== 'both') {
        router.replace('/login');
      }
    }
  }, [data, router]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  if (isUnauthorized || !data || (data.role !== 'admin' && data.role !== 'both')) {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}
