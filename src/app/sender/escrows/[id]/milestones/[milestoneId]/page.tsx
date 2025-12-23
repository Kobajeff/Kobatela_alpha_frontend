'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage } from '@/lib/apiClient';
import { normalizeApiError } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import { useMilestoneDetail } from '@/lib/queries/sender';
import { mapMilestoneStatusToBadge } from '@/lib/uiMappings';

export default function SenderMilestoneDetailPage() {
  const params = useParams<{ id: string; milestoneId: string }>();
  const escrowId = params?.id ?? '';
  const milestoneId = params?.milestoneId ?? '';
  const router = useRouter();
  const query = useMilestoneDetail(milestoneId);
  const queryClient = useQueryClient();
  const milestone = query.data;
  const refreshing = query.isFetching;

  const refreshMilestone = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.milestones.byId(milestoneId)
    });

  if (query.isLoading) {
    return <LoadingState label="Chargement du jalon..." />;
  }

  if (query.isError) {
    const status = normalizeApiError(query.error).status;
    if (status === 409 || status === 422) {
      return <LoadingState label="Actualisation du jalon..." />;
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

  if (!milestone) {
    return null;
  }

  const badge = mapMilestoneStatusToBadge(milestone.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Détail du jalon</h1>
          <div className="mt-1 text-sm text-slate-500">
            Escrow <span className="font-medium text-slate-700">{escrowId}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={refreshMilestone} disabled={refreshing}>
            {refreshing ? 'Actualisation...' : 'Rafraîchir'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push(`/sender/escrows/${escrowId}/milestones`)}
          >
            Retour aux jalons
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jalon {milestone.id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <div>
            <p className="text-sm text-slate-500">Nom</p>
            <p className="font-medium">{milestone.name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Statut</p>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <div>
            <p className="text-sm text-slate-500">Échéance</p>
            <p>{milestone.due_date ? formatDateTime(milestone.due_date) : '—'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
