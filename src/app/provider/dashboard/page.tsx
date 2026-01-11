'use client';

import Link from 'next/link';
import { isForbiddenError } from '@/lib/apiClient';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { useProviderInboxEscrows } from '@/lib/queries/provider';
import { ProviderEscrowsSummary } from '@/components/dashboard/ProviderEscrowsSummary';

const SUMMARY_LIMIT = 5;

export default function ProviderDashboardPage() {
  const { data, isLoading, isError, error } = useProviderInboxEscrows({
    limit: SUMMARY_LIMIT,
    offset: 0
  });

  if (isLoading) {
    return <LoadingState label="Chargement de la boîte de réception..." />;
  }

  if (isError) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <ErrorAlert
          message={
            isForbiddenError(error)
              ? 'Access restricted.'
              : error?.message ?? 'Erreur lors du chargement de la boîte de réception.'
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg bg-white p-6 shadow">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Boîte de réception prestataire</h1>
          <p className="text-slate-600">
            Liste des escrows qui requièrent votre intervention pour déposer des preuves.
          </p>
        </div>
        <Link
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          href="/provider/inbox"
        >
          Voir tout
        </Link>
      </div>

      <ProviderEscrowsSummary items={data?.items ?? []} />
    </div>
  );
}
