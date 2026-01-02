'use client';

// Shell for admin routes including header, sidebar, and main content.
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { userHasScope } from '@/lib/scopes';
import type { AuthUser } from '@/types/api';
import { Header } from './Header';

const adminDashboardPath = ['', 'admin', 'dashboard'].join('/');
const adminSendersPath = ['', 'admin', 'senders'].join('/');
const adminReviewQueuePath = ['', 'admin', 'proofs', 'review-queue'].join('/');

type AdminShellProps = {
  children: ReactNode;
  user?: AuthUser;
};

export function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const hasPricingScope = useMemo(() => userHasScope(user, 'pricing_admin'), [user]);

  const adminLinks = useMemo(
    () =>
      [
        { href: adminDashboardPath, label: 'Dashboard' },
        { href: '/admin/users', label: 'Users' },
        { href: adminSendersPath, label: 'Senders' },
        { href: adminReviewQueuePath, label: 'Proof review queue' },
        { href: '/admin/alerts', label: 'Alerts' },
        { href: '/admin/fraud/score-comparison', label: 'Fraud score comparison' },
        { href: '/admin/risk-snapshots', label: 'Risk snapshots' },
        { href: '/admin/advisors', label: 'Advisors' },
        { href: '/admin/settings/ai-proof', label: 'AI proof settings' },
        hasPricingScope
          ? { href: '/admin/pricing', label: 'Pricing' }
          : null
      ].filter(Boolean) as Array<{ href: string; label: string }>,
    [hasPricingScope]
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
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
