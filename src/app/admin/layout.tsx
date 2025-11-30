'use client';

// Layout guarding admin routes and providing the admin chrome.
import { useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAuthMe } from '@/lib/queries/sender';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading, error, isError } = useAuthMe();

  const isUnauthorized = isError && axios.isAxiosError(error) && error.response?.status === 401;

  useEffect(() => {
    if (isUnauthorized) {
      router.replace('/login');
    }
  }, [isUnauthorized, router]);

  useEffect(() => {
    if (isError && !isUnauthorized) {
      router.replace('/login');
    }
  }, [isError, isUnauthorized, router]);

  useEffect(() => {
    if (data) {
      if (data.role === 'sender') {
        router.replace('/sender/dashboard');
      } else if (data.role !== 'admin') {
        router.replace('/login');
      }
    }
  }, [data, router]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center">Loading...</div>;
  }

  if (isUnauthorized || !data || data.role !== 'admin') {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}
