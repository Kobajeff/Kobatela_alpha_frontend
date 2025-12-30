'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAdvisorAssignedProofs } from '@/lib/queries/advisor';
import { queryKeys } from '@/lib/queryKeys';
import type { AdvisorProofItem } from '@/types/api';

type ViewFilter = 'all' | 'open' | 'terminal';

const statusTabs: { value: ViewFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'open', label: 'En cours' },
  { value: 'terminal', label: 'Terminés' }
];

const terminalProofStatuses = new Set(['APPROVED', 'REJECTED', 'CANCELLED']);

function isTerminal(status: string | undefined) {
  return status ? terminalProofStatuses.has(status.toUpperCase()) : false;
}

export default function AdvisorQueuePage() {
  const [filter, setFilter] = useState<ViewFilter>('all');
  const statusParam = filter === 'open' ? 'PENDING' : undefined;
  const { data, isLoading, isError, error, isFetching, refetch } = useAdvisorAssignedProofs({
    status: statusParam
  });
  const queryClient = useQueryClient();

  const proofs = useMemo(() => {
    if (!data) return [];
    if (filter === 'terminal') {
      return data.filter((item) => isTerminal(item.status));
    }
    if (filter === 'open') {
      return data.filter((item) => !isTerminal(item.status));
    }
    return data;
  }, [data, filter]);

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: queryKeys.advisor.assignedProofs({ status: statusParam }) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Assigned proofs</h1>
          <p className="text-sm text-slate-600">
            File queue assigned to you. Decisions are read-only for advisors.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isFetching}>
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="flex gap-2">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={tab.value === filter ? 'primary' : 'outline'}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading && <LoadingState label="Chargement de vos preuves assignées..." />}
      {isError && !isLoading && <ErrorAlert message={error?.message ?? 'Erreur de chargement.'} />}

      {!isLoading && !isError && (
        <Card>
          <CardHeader>
            <CardTitle>Proofs</CardTitle>
          </CardHeader>
          <CardContent>
            {proofs.length === 0 ? (
              <EmptyState message="Aucune preuve assignée pour le moment." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="bg-slate-50 text-left text-sm font-semibold text-slate-700">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Escrow</th>
                      <th className="px-4 py-3">Milestone</th>
                      <th className="px-4 py-3">Sender</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Attachment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {proofs.map((proof) => (
                      <ProofRow key={proof.id} proof={proof} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString();
}

function ProofRow({ proof }: { proof: AdvisorProofItem }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 font-mono text-xs text-slate-700">{proof.id}</td>
      <td className="px-4 py-3">{proof.escrow_id}</td>
      <td className="px-4 py-3">{proof.milestone_name ?? proof.milestone_id ?? '—'}</td>
      <td className="px-4 py-3">{proof.sender_email ?? '—'}</td>
      <td className="px-4 py-3">
        <StatusBadge type="proof" status={proof.status} />
      </td>
      <td className="px-4 py-3 text-slate-600">{formatDate(proof.created_at)}</td>
      <td className="px-4 py-3">
        {proof.storage_key || proof.storage_url || proof.attachment_url || proof.file_url
          ? 'Fichier reçu'
          : '—'}
      </td>
    </tr>
  );
}
