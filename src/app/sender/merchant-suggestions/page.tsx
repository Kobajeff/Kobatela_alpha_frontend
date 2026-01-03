'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMerchantSuggestionsList } from '@/lib/queries/sender';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { extractErrorMessage, isForbiddenError } from '@/lib/apiClient';

export default function MerchantSuggestionsPage() {
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useMerchantSuggestionsList();

  const isForbidden = isError && isForbiddenError(error);
  const accessDeniedMessage = 'Access denied.';

  if (isLoading) {
    return <LoadingState label="Chargement des suggestions..." />;
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <ErrorAlert message={isForbidden ? accessDeniedMessage : extractErrorMessage(error)} />
        {!isForbidden && (
          <Button variant="outline" onClick={() => refetch()}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Suggestions de commerçants</h1>
          <p className="text-sm text-slate-600">
            Proposez de nouveaux commerçants à ajouter sur Kobatela ou suivez vos suggestions existantes.
          </p>
        </div>
        <Link href="/sender/merchant-suggestions/new">
          <Button>Nouvelle suggestion</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg">Vos suggestions</CardTitle>
          <div className="text-sm text-slate-600">Total : {items.length}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-slate-600">Aucune suggestion pour l&apos;instant.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Statut</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Créé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {items.map((suggestion) => (
                    <tr
                      key={suggestion.id}
                      className="cursor-pointer hover:bg-indigo-50"
                      onClick={() => router.push(`/sender/merchant-suggestions/${suggestion.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-indigo-700">{suggestion.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{suggestion.status ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {suggestion.created_at ? new Date(suggestion.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-sm text-slate-600">Pagination non disponible (liste complète).</div>
        </CardContent>
      </Card>
    </div>
  );
}
