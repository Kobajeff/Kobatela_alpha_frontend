'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { ForbiddenBanner } from '@/components/shared/ForbiddenBanner';
import { PaginatedTable } from '@/components/Table/PaginatedTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { useForbiddenAction } from '@/lib/hooks/useForbiddenAction';
import { formatDateTime } from '@/lib/format';
import { extractErrorMessage } from '@/lib/apiClient';
import { getPaginatedLimitOffset } from '@/lib/queries/queryUtils';
import { useAdminProofDecision } from '@/lib/queries/admin';
import { useAdminProofReviewQueue } from '@/hooks/admin/useAdminProofReviewQueue';
import type { AdminProofReviewItem, ProofStatus } from '@/types/api';

const DEFAULT_LIMIT = 20;

function formatNullable(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function formatList(values?: string[] | null) {
  if (!values || values.length === 0) return '—';
  return values.join(', ');
}

export default function AdminProofReviewQueuePage() {
  const [offset, setOffset] = useState(0);
  const [advisorId, setAdvisorId] = useState('');
  const [senderId, setSenderId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [reviewMode, setReviewMode] = useState('');
  const [status, setStatus] = useState<ProofStatus | ''>('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [processingId, setProcessingId] = useState<string | undefined>();
  const [actionError, setActionError] = useState('');
  const { showToast } = useToast();
  const { forbidden, forbiddenMessage, forbiddenCode, forbidWith } = useForbiddenAction();

  const filters = useMemo(
    () => ({
      advisor_id: advisorId.trim() || undefined,
      sender_id: senderId.trim() || undefined,
      provider_id: providerId.trim() || undefined,
      review_mode: reviewMode.trim() || undefined,
      status: status || undefined,
      unassigned_only: unassignedOnly || undefined
    }),
    [advisorId, providerId, reviewMode, senderId, status, unassignedOnly]
  );

  useEffect(() => {
    setOffset(0);
  }, [
    filters.advisor_id,
    filters.sender_id,
    filters.provider_id,
    filters.review_mode,
    filters.status,
    filters.unassigned_only
  ]);

  const queueQuery = useAdminProofReviewQueue({
    limit: DEFAULT_LIMIT,
    offset,
    ...filters
  });

  const decision = useAdminProofDecision();

  const isForbidden = queueQuery.isError
    ? axios.isAxiosError(queueQuery.error) && queueQuery.error.response?.status === 403
    : false;

  const getDecisionErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      if (statusCode === 403) return 'Insufficient scope';
      if (statusCode === 404 || statusCode === 405) return 'Endpoint not available';
    }

    return extractErrorMessage(error);
  };

  const getQueueErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      if (statusCode === 403) return 'Access restricted';
      if (statusCode === 422) return extractErrorMessage(error);
    }

    return extractErrorMessage(error);
  };

  const handleApprove = async (proofId: string) => {
    setProcessingId(proofId);
    setActionError('');
    try {
      await decision.mutateAsync({ proofId, payload: { decision: 'approve' } });
      showToast('Proof updated successfully', 'success');
    } catch (err) {
      const normalized = forbidWith(err);
      const message = normalized.message ?? getDecisionErrorMessage(err);
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setProcessingId(undefined);
    }
  };

  const handleReject = async (proofId: string) => {
    setProcessingId(proofId);
    setActionError('');
    try {
      await decision.mutateAsync({ proofId, payload: { decision: 'reject' } });
      showToast('Proof updated successfully', 'success');
    } catch (err) {
      const normalized = forbidWith(err);
      const message = normalized.message ?? getDecisionErrorMessage(err);
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setProcessingId(undefined);
    }
  };

  if (queueQuery.isLoading) {
    return <LoadingState label="Chargement de la file de preuves..." />;
  }

  if (queueQuery.isError && !isForbidden) {
    return (
      <div className="p-4">
        <ErrorAlert message={getQueueErrorMessage(queueQuery.error)} />
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="space-y-4">
        <ForbiddenBanner
          title="Access restricted"
          subtitle="Ops-only review queue. Please contact an admin or support operator."
          code="INSUFFICIENT_SCOPE"
        />
      </div>
    );
  }

  const data = queueQuery.data;
  const items = data?.items ?? [];
  const total = data?.total ?? items.length;
  const { limit: responseLimit, offset: responseOffset } = getPaginatedLimitOffset<AdminProofReviewItem>(
    data
  );
  const pageSize = responseLimit && responseLimit > 0 ? responseLimit : DEFAULT_LIMIT;
  const currentOffset = responseOffset ?? offset;

  const handlePrev = () => {
    setOffset((prev) => Math.max(prev - pageSize, 0));
  };

  const handleNext = () => {
    setOffset((prev) => prev + pageSize);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-600">
            Advisor ID
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
              value={advisorId}
              onChange={(event) => setAdvisorId(event.target.value)}
              placeholder="advisor_id"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Sender ID
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
              value={senderId}
              onChange={(event) => setSenderId(event.target.value)}
              placeholder="sender_id"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Provider ID
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
              placeholder="provider_id"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Review mode
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
              value={reviewMode}
              onChange={(event) => setReviewMode(event.target.value)}
              placeholder="review_queue"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Status
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
              value={status}
              onChange={(event) => setStatus(event.target.value as ProofStatus | '')}
            >
              <option value="">All</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(event) => setUnassignedOnly(event.target.checked)}
            />
            Unassigned only
          </label>
        </div>
      </div>

      {forbidden && (
        <ForbiddenBanner
          title={forbiddenMessage || 'Action non autorisée'}
          subtitle="Ops-only actions are restricted for this account."
          code={forbiddenCode}
        />
      )}

      <PaginatedTable
        title="Proof review queue"
        description="Ops/support queue with AI decisioning signals."
        limit={pageSize}
        offset={currentOffset}
        total={total}
        pageItemCount={items.length}
        onPrev={handlePrev}
        onNext={handleNext}
        toolbar={actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Escrow</th>
                <th className="px-4 py-3">Milestone</th>
                <th className="px-4 py-3">Advisor</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payout eligible</th>
                <th className="px-4 py-3">Payout blocked</th>
                <th className="px-4 py-3">AI risk</th>
                <th className="px-4 py-3">AI score</th>
                <th className="px-4 py-3">AI flags</th>
                <th className="px-4 py-3">AI explanation</th>
                <th className="px-4 py-3">AI checked</th>
                <th className="px-4 py-3">AI reviewed by</th>
                <th className="px-4 py-3">AI reviewed at</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={16}>
                    Aucune preuve en attente.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.proof_id} className="align-top">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link
                        className="text-indigo-600 hover:text-indigo-700"
                        href={`/admin/escrows/${item.escrow_id}`}
                      >
                        {item.proof_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.escrow_id}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatNullable(item.milestone_id)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.advisor ? (
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800">
                            {item.advisor.first_name} {item.advisor.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{item.advisor.email}</p>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <StatusBadge type="proof" status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.payout_eligible === null || item.payout_eligible === undefined
                        ? '—'
                        : item.payout_eligible
                        ? 'Oui'
                        : 'Non'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatList(item.payout_blocked_reasons ?? undefined)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatNullable(item.ai_risk_level)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatNullable(item.ai_score)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatList(item.ai_flags ?? undefined)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p className="max-w-xs break-words">{formatNullable(item.ai_explanation)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.ai_checked_at ? formatDateTime(item.ai_checked_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatNullable(item.ai_reviewed_by)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.ai_reviewed_at ? formatDateTime(item.ai_reviewed_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Link
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                          href={`/admin/escrows/${item.escrow_id}`}
                        >
                          Voir le détail
                        </Link>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={
                              processingId === String(item.proof_id) ||
                              forbidden ||
                              decision.isPending
                            }
                            onClick={() => handleApprove(String(item.proof_id))}
                          >
                            Approuver
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={
                              processingId === String(item.proof_id) ||
                              forbidden ||
                              decision.isPending
                            }
                            onClick={() => handleReject(String(item.proof_id))}
                          >
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PaginatedTable>
    </div>
  );
}
