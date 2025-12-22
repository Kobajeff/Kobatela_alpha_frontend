'use client';

// Landing page redirects users to the correct dashboard based on authentication.
import { useEffect } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { useAuthMe } from '@/lib/queries/sender';
import { AuthUser } from '@/types/api';

const adminDashboardPath = ['', 'admin', 'dashboard'].join('/');
const senderDashboardPath = ['', 'sender', 'dashboard'].join('/');

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading, isError } = useAuthMe();
  const user = data as AuthUser | undefined;

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    if (user?.role === 'admin') {
      router.replace(adminDashboardPath as Route);
    } else if (user?.role) {
      router.replace(senderDashboardPath as Route);
    } else if (isError) {
      router.replace('/login');
    }
  }, [isError, router, user]);

  return (
    <div className="flex h-full items-center justify-center">
      {isLoading ? 'Loading...' : 'Redirection...'}
    </div>
  );
}
