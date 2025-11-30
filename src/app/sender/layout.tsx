'use client';

// Layout guarding sender routes and wrapping them in the application shell.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthMe } from '@/lib/queries/sender';

export default function SenderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading, error } = useAuthMe();

  useEffect(() => {
    if (error) {
      router.replace('/login');
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <main>
        <div className="container text-center text-slate-600">Chargement...</div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
