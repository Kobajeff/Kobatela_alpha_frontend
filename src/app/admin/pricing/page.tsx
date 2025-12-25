'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { Card } from '@/components/ui/Card';
import { useAuthMe } from '@/lib/queries/sender';
import { userHasScope } from '@/lib/scopes';
import type { AuthUser } from '@/types/api';

const tabs = [
  { href: '/admin/pricing/reference-import', label: 'Reference Import' },
  { href: '/admin/pricing/inflation', label: 'Inflation Adjustments' }
];

export default function AdminPricingPage() {
  const { data: user } = useAuthMe();
  const authUser = user as AuthUser | undefined;
  const hasPricingScope = userHasScope(authUser, 'pricing_admin');

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Pricing Admin</h1>
        <p className="text-sm text-slate-600">
          Manage reference pricing data and inflation adjustments. Access requires the
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">pricing_admin</code>
          scope.
        </p>
      </div>

      {!hasPricingScope && (
        <ErrorAlert message="Access denied (pricing_admin required). Your session remains active." />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {tabs.map((tab) => (
          <Card key={tab.href} className="flex flex-col gap-3 p-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{tab.label}</h2>
              <p className="text-sm text-slate-600">
                {tab.href.endsWith('reference-import')
                  ? 'Upload CSVs for pricing reference and inflation data.'
                  : 'List, create, and edit inflation adjustments.'}
              </p>
            </div>
            <Link
              href={tab.href as Route}
              className="inline-flex w-fit items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Open {tab.label}
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
