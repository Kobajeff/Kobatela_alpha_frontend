'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useMerchantSuggestion } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { Badge } from '@/components/ui/Badge';
import { extractErrorMessage, isForbiddenError, isNotFoundError } from '@/lib/apiClient';
import type { MerchantSuggestionStatus } from '@/types/api';

const statusBadgeMap: Record<MerchantSuggestionStatus, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'PENDING', variant: 'warning' },
  APPROVED: { label: 'APPROVED', variant: 'success' },
  REJECTED: { label: 'REJECTED', variant: 'danger' }
};

export default function MerchantSuggestionDetailPage({
  params
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const suggestionId = params.id;
  const { data, isLoading, isError, error, refetch, isFetching } = useMerchantSuggestion(suggestionId);

  const isForbidden = isError && isForbiddenError(error);
  const isNotFound = isError && isNotFoundError(error);

  if (isLoading) {
    return <LoadingState label="Chargement de la suggestion..." />;
  }

  if (isNotFound) {
    return (
      <div className="space-y-4">
        <ErrorAlert message="Suggestion introuvable." />
        <Button variant="outline" onClick={() => router.push('/sender/merchant-suggestions')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <ErrorAlert message={isForbidden ? 'Accès restreint.' : extractErrorMessage(error)} />
        {!isForbidden && (
          <Button variant="outline" onClick={() => refetch()}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Détail de la suggestion</h1>
          <p className="text-sm text-slate-600">
            Retrouvez les informations principales de votre suggestion de marchand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/sender/merchant-suggestions')}>
            Retour à la liste
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Rafraîchir
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">ID</span>
            <span>{data.id ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Prestataire / Marchand</span>
            <span>{data.name ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Code pays</span>
            <span>{data.country_code ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Statut</span>
            {data.status ? (
              <Badge variant={statusBadgeMap[data.status].variant}>
                {statusBadgeMap[data.status].label}
              </Badge>
            ) : (
              <Badge variant="muted">—</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Créé le</span>
            <span>
              {data.created_at
                ? new Date(data.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-500">
        Besoin d&apos;aide ?{' '}
        <Link className="font-medium text-indigo-600 hover:text-indigo-500" href="mailto:support@kobatela.com">
          Contactez notre support
        </Link>
      </div>
    </div>
  );
}
