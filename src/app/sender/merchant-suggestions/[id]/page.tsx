'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useMerchantSuggestion } from '@/lib/queries/sender';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage, isForbiddenError, isNotFoundError } from '@/lib/apiClient';

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
        <ErrorAlert message={isForbidden ? 'Access denied.' : extractErrorMessage(error)} />
        {!isForbidden && (
          <Button variant="outline" onClick={() => refetch()}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const formattedPayload = JSON.stringify(data.payload ?? data, null, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Suggestion {data.id}</h1>
          <p className="text-sm text-slate-600">Détails et statut de votre suggestion de commerçant.</p>
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
          <CardTitle>Statut</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">État</span>
            <span>{data.status ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Créé le</span>
            <span>{data.created_at ? new Date(data.created_at).toLocaleString() : '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Mis à jour</span>
            <span>{data.updated_at ? new Date(data.updated_at).toLocaleString() : '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Données de la suggestion</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-900 p-4 text-xs text-slate-100">
            {formattedPayload}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
