'use client';

import Link from 'next/link';
import { extractErrorMessage } from '@/lib/apiClient';
import { useProviderInboxEscrows } from '@/lib/queries/provider';
import { useSenderEscrows } from '@/lib/queries/sender';
import { RequireScope } from '@/components/system/RequireScope';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SenderEscrowsSummary } from '@/components/dashboard/SenderEscrowsSummary';
import { ProviderEscrowsSummary } from '@/components/dashboard/ProviderEscrowsSummary';

const SUMMARY_LIMIT = 5;

function DashboardContent() {
  const senderEscrows = useSenderEscrows({ limit: SUMMARY_LIMIT, offset: 0 });
  const providerEscrows = useProviderInboxEscrows({ limit: SUMMARY_LIMIT, offset: 0 });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-slate-600">
          Retrouvez vos escrows expéditeur et prestataire sans changer de compte.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Mes escrows expéditeur</CardTitle>
            <p className="text-sm text-slate-500">Derniers escrows où vous êtes expéditeur.</p>
          </div>
          <Link className="text-sm font-medium text-indigo-600 hover:text-indigo-500" href="/sender/escrows">
            Voir tout
          </Link>
        </CardHeader>
        <CardContent>
          {senderEscrows.isLoading ? (
            <LoadingState label="Chargement des escrows expéditeur..." fullHeight={false} />
          ) : senderEscrows.isError ? (
            <ErrorAlert message={extractErrorMessage(senderEscrows.error)} />
          ) : (
            <SenderEscrowsSummary escrows={senderEscrows.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Mes escrows prestataire</CardTitle>
            <p className="text-sm text-slate-500">Derniers escrows où vous êtes prestataire.</p>
          </div>
          <Link
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            href="/provider/dashboard"
          >
            Voir tout
          </Link>
        </CardHeader>
        <CardContent>
          {providerEscrows.isLoading ? (
            <LoadingState label="Chargement des escrows prestataire..." fullHeight={false} />
          ) : providerEscrows.isError ? (
            <ErrorAlert message={extractErrorMessage(providerEscrows.error)} />
          ) : (
            <ProviderEscrowsSummary items={providerEscrows.data?.items ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UnifiedDashboardPage() {
  return (
    <RequireScope loadingLabel="Chargement du tableau de bord...">
      <DashboardContent />
    </RequireScope>
  );
}
