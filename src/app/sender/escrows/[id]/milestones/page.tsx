'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import { useEscrowMilestones } from '@/lib/queries/sender';
import { mapMilestoneStatusToBadge } from '@/lib/uiMappings';

export default function SenderEscrowMilestonesPage() {
  const params = useParams<{ id: string }>();
  const escrowId = params?.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useEscrowMilestones(escrowId);
  const milestones = useMemo(() => query.data ?? [], [query.data]);
  const lastUpdatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null;
  const refreshing = query.isFetching;
  const activeMilestoneCount = useMemo(
    () =>
      milestones.filter((milestone) => {
        const status = String(milestone.status).toUpperCase();
        return status === 'PENDING_REVIEW' || status === 'PAYING';
      }).length,
    [milestones]
  );

  const refreshMilestones = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.milestones.byEscrow(escrowId)
    });

  if (query.isLoading) {
    return <LoadingState label="Chargement des jalons..." />;
  }

  if (query.isError) {
    const status = normalizeApiError(query.error).status;
    if (status === 409 || status === 422) {
      return <LoadingState label="Actualisation des jalons..." />;
    }
    const message = (() => {
      if (status === 403) return 'Access denied';
      if (status === 404) return 'Not found';
      return extractErrorMessage(query.error);
    })();
    return (
      <div className="p-4">
        <ErrorAlert message={message} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Jalons</h1>
          <div className="mt-1 text-sm text-slate-500">
            Escrow <span className="font-medium text-slate-700">{escrowId}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={refreshMilestones} disabled={refreshing}>
            {refreshing ? 'Actualisation...' : 'Rafraîchir'}
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/sender/escrows/${escrowId}`)}>
            Retour à l'escrow
          </Button>
        </div>
      </div>

      {activeMilestoneCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Mise à jour automatique en cours pour {activeMilestoneCount} jalon
          {activeMilestoneCount > 1 ? 's' : ''}.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg">Liste des jalons</CardTitle>
          {lastUpdatedAt && (
            <span className="text-xs text-slate-500">
              Dernière mise à jour : {formatDateTime(lastUpdatedAt)}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {milestones.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-600">Aucun jalon enregistré.</div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Statut</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Échéance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {milestones.map((milestone) => (
                    <tr key={milestone.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-indigo-700">
                        <Link href={`/sender/escrows/${escrowId}/milestones/${milestone.id}`}>
                          {milestone.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{milestone.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {(() => {
                          const badge = mapMilestoneStatusToBadge(milestone.status);
                          return <Badge variant={badge.variant}>{badge.label}</Badge>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {milestone.due_date ? formatDateTime(milestone.due_date) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
