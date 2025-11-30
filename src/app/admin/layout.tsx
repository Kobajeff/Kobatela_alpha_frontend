'use client';

// Layout guarding admin routes and providing the admin chrome.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAuthMe } from '@/lib/queries/sender';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading, error } = useAuthMe();

  useEffect(() => {
    if (error) {
      router.replace('/login');
    }
  }, [error, router]);

  useEffect(() => {
    if (data && data.role !== 'admin') {
      // Only admins should access these routes; redirect others to the sender area.
      router.replace('/sender/dashboard');
    }
  }, [data, router]);

  if (isLoading) {
    return (
      <main>
        <div className="container text-center text-slate-600">Chargement...</div>
      </main>
    );
  }

  if (!data || data.role !== 'admin') {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}
