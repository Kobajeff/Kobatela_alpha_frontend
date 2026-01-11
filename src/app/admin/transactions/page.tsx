'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { RequireScope } from '@/components/system/RequireScope';
import { formatDateTime } from '@/lib/format';
import { opsTransactionsEnabled } from '@/lib/featureFlags';
import { useAdminTransactions } from '@/lib/queries/admin';
import { getPaginatedLimitOffset } from '@/lib/queries/queryUtils';
import type { TransactionRead } from '@/types/api';
import { OpsErrorState } from '@/components/admin/OpsErrorState';
import { OpsPagination } from '@/components/admin/OpsPagination';

const DEFAULT_LIMIT = 20;

function TransactionsContent() {
  const [offset, setOffset] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);
  const transactionsEnabled = opsTransactionsEnabled();

  const transactionsQuery = useAdminTransactions(
    { limit, offset },
    { enabled: transactionsEnabled }
  );

  const { limit: responseLimit, offset: responseOffset } =
    getPaginatedLimitOffset<TransactionRead>(transactionsQuery.data);
  const pageSize = responseLimit && responseLimit > 0 ? responseLimit : limit;
  const currentOffset = responseOffset ?? offset;

  const items = useMemo(
    () => transactionsQuery.data?.items ?? [],
    [transactionsQuery.data?.items]
  );
  const total = transactionsQuery.data?.total ?? items.length;

  const handlePrev = () => setOffset((prev) => Math.max(prev - pageSize, 0));
  const handleNext = () => setOffset((prev) => prev + pageSize);

  if (!transactionsEnabled) {
    return (
      <Card>
        <CardContent className="space-y-2">
          <CardTitle>Transactions disabled (feature flag off)</CardTitle>
          <p className="text-sm text-slate-600">
            The admin transactions view is behind a feature flag. Enable NEXT_PUBLIC_FF_ADMIN_TRANSACTIONS to
            access this read-only feed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (transactionsQuery.isLoading) {
    return <LoadingState label="Chargement des transactions..." />;
  }

  if (transactionsQuery.isError) {
    const status = isAxiosError(transactionsQuery.error)
      ? transactionsQuery.error.response?.status
      : null;
    const message =
      status === 401 || status === 403
        ? 'Accès refusé : seule la portée admin peut consulter les transactions.'
        : undefined;
    return (
      <OpsErrorState
        error={transactionsQuery.error}
        statusCode={status}
        fallbackMessage={message}
        onRetry={() => transactionsQuery.refetch()}
      />
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title="Aucune transaction"
        message="Aucune transaction disponible pour le moment."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Transactions</h1>
          <p className="text-sm text-slate-500">
            Lecture seule des transactions (admin scope uniquement).
          </p>
        </div>
        <OpsPagination
          limit={pageSize}
          offset={currentOffset}
          total={total}
          pageItemCount={items.length}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sender ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Receiver ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Créée le
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mise à jour
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((transaction) => (
              <tr key={String(transaction.id)} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-800">
                  {transaction.id}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{transaction.sender_id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{transaction.receiver_id}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {transaction.amount} {transaction.currency}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{transaction.status}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {transaction.created_at ? formatDateTime(transaction.created_at) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {transaction.updated_at ? formatDateTime(transaction.updated_at) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminTransactionsPage() {
  return (
    <RequireScope
      anyScopes={['ADMIN']}
      unauthorizedMessage="Accès refusé : cette page est réservée aux administrateurs."
      loadingLabel="Vérification de l'accès administrateur..."
    >
      <TransactionsContent />
    </RequireScope>
  );
}
