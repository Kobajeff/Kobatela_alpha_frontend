'use client';

// Shell for admin routes including header, sidebar, and main content.
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useAuthMe } from '@/lib/queries/sender';
import { AuthUser } from '@/types/api';
import { LogoutButton } from './LogoutButton';

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/senders', label: 'Senders' },
  { href: '/admin/proofs/review-queue', label: 'Proof review queue' },
  { href: '/admin/advisors', label: 'Advisors' },
  { href: '/admin/settings/ai-proof', label: 'AI proof settings' }
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useAuthMe();
  const user = data as AuthUser | undefined;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-lg font-semibold">
          <span className="rounded-md bg-indigo-600 px-2 py-1 text-white">KCT</span>
          <span>Admin</span>
        </Link>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>{user ? `Connecté : ${user.full_name ?? user.email}` : 'Chargement...'}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="flex">
        <aside className="w-60 border-r border-slate-200 bg-white px-4 py-6">
          <nav className="flex flex-col gap-2">
            {adminLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href as Route}
                  className={`rounded-md px-3 py-2 text-sm font-medium hover:bg-indigo-50 ${
                    active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-5xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
