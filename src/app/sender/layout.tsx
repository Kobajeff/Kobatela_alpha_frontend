'use client';

// Layout guarding sender routes and wrapping them in the application shell.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { isUnauthorizedError } from '@/lib/apiClient';
import { useAuthMe } from '@/lib/queries/sender';

export default function SenderLayout({ children }: { children: React.ReactNode }) {
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
      if (data.role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (data.role !== 'sender' && data.role !== 'both') {
        router.replace('/login');
      }
    }
  }, [data, router]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  if (isUnauthorized || !data || (data.role !== 'sender' && data.role !== 'both')) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
