'use client';

// Landing page redirects users to the correct dashboard based on authentication.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { useAuthMe } from '@/lib/queries/sender';

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading, isError } = useAuthMe();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    if (data?.role === 'admin') {
      router.replace('/admin/dashboard');
    } else if (data?.role) {
      router.replace('/sender/dashboard');
    } else if (isError) {
      router.replace('/login');
    }
  }, [data, isError, router]);

  return (
    <div className="flex h-full items-center justify-center">
      {isLoading ? 'Loading...' : 'Redirection...'}
    </div>
  );
}
