'use client';

// Detail view for a single escrow including milestones, proofs, and payments.
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FundingStatusBanner } from '@/components/sender/FundingStatusBanner';
import { ForbiddenBanner } from '@/components/shared/ForbiddenBanner';
import { formatDateTime } from '@/lib/format';
import type { SenderEscrowSummary } from '@/types/api';
import { isFundingTerminal } from '@/lib/escrowFunding';
import { Badge } from '@/components/ui/Badge';
import {
  mapEscrowStatusToBadge,
  mapMilestoneStatusToBadge,
  mapPaymentStatusToBadge,
  mapProofStatusToBadge
} from '@/lib/uiMappings';
import { canRequestAdvisorReview } from '@/lib/proofAdvisorReview';

interface SenderEscrowDetailsProps {
  summary: SenderEscrowSummary;
  onMarkDelivered: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCheckDeadline: () => void;
  onRequestAdvisorReview?: (proofId: string) => void;
  proofRequestPendingId?: string | null;
  proofRequestMessage?: { tone: 'success' | 'info' | 'error'; text: string } | null;
  onStartFundingSession?: () => void;
  onDirectDeposit?: () => void;
  fundingSessionPending?: boolean;
  depositPending?: boolean;
  fundingProcessing?: boolean;
  fundingElapsedMs?: number;
  fundingRefreshPending?: boolean;
  onFundingRefresh?: () => void;
  fundingError?: string | null;
  depositError?: string | null;
  fundingNote?: string | null;
  showDirectDeposit?: boolean;
  loading?: boolean;
  processing?: boolean;
  lastUpdatedAt?: string | Date | null;
  proofReviewActive?: boolean;
  proofReviewError?: string | null;
  forbidden?: boolean;
  forbiddenTitle?: string;
  forbiddenSubtitle?: string;
  forbiddenCode?: string;
  locallyRequestedProofIds?: Set<string>;
  proofForm?: ReactNode;
}

export function SenderEscrowDetails({
  summary,
  onApprove,
  onCheckDeadline,
  onMarkDelivered,
  onReject,
  onRequestAdvisorReview,
  proofRequestPendingId,
  proofRequestMessage,
  onStartFundingSession,
  onDirectDeposit,
  fundingSessionPending,
  depositPending,
  fundingProcessing,
  fundingElapsedMs = 0,
  fundingRefreshPending,
  onFundingRefresh,
  fundingError,
  depositError,
  fundingNote,
  showDirectDeposit,
  loading,
  processing,
  lastUpdatedAt,
  proofReviewActive,
  proofReviewError,
  forbidden = false,
  forbiddenTitle,
  forbiddenSubtitle,
  forbiddenCode,
  locallyRequestedProofIds,
  proofForm
}: SenderEscrowDetailsProps) {
  const router = useRouter();
  const fundingComplete = isFundingTerminal(summary);
  const canTriggerFunding = Boolean(onStartFundingSession && !fundingComplete);
  const fundingButtonsDisabled =
    Boolean(loading || processing || fundingSessionPending || depositPending);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Escrow {summary.escrow.id}</CardTitle>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span>Statut :</span>
              {(() => {
                const badge = mapEscrowStatusToBadge(summary.escrow.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onMarkDelivered} disabled={loading || forbidden || processing}>
              Marquer livré
            </Button>
            <Button variant="secondary" onClick={onApprove} disabled={loading || processing}>
              Approuver
            </Button>
            <Button variant="danger" onClick={onReject} disabled={loading || forbidden || processing}>
              Rejeter
            </Button>
            <Button variant="outline" onClick={onCheckDeadline} disabled={loading || forbidden || processing}>
              Vérifier l'échéance
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/sender/escrows/${summary.escrow.id}/external-proof-tokens`)}
            >
              Portail externe
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-700">
          {forbidden && (
            <ForbiddenBanner title={forbiddenTitle} subtitle={forbiddenSubtitle} code={forbiddenCode} />
          )}
          <p>
            Montant : {summary.escrow.amount} {summary.escrow.currency}
          </p>
          <p className="text-sm text-slate-500">Créé le {formatDateTime(summary.escrow.created_at)}</p>
          {lastUpdatedAt && (
            <p className="text-xs text-slate-500">Last updated : {formatDateTime(lastUpdatedAt)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Statut :</span>
            {(() => {
              const badge = mapEscrowStatusToBadge(summary.escrow.status);
              return <Badge variant={badge.variant}>{badge.label}</Badge>;
            })()}
          </div>
          <FundingStatusBanner
            isActive={Boolean(fundingProcessing)}
            elapsedMs={fundingElapsedMs}
            lastUpdatedAt={lastUpdatedAt}
            isFetching={fundingRefreshPending}
            onRefresh={onFundingRefresh}
          />
          {fundingNote && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {fundingNote}
            </div>
          )}
          {fundingError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {fundingError}
            </div>
          )}
          {depositError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {depositError}
            </div>
          )}
          {canTriggerFunding ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={onStartFundingSession} disabled={fundingButtonsDisabled}>
                {fundingSessionPending ? 'Session PSP...' : 'Pay via PSP'}
              </Button>
              {showDirectDeposit && (
                <Button
                  variant="outline"
                  onClick={onDirectDeposit}
                  disabled={fundingButtonsDisabled}
                >
                  {depositPending ? 'Dépôt en cours...' : 'Direct deposit'}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Le financement est terminé ou en phase finale.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>Jalons</CardTitle>
          <Button
            variant="outline"
            onClick={() => router.push(`/sender/escrows/${summary.escrow.id}/milestones`)}
          >
            View all milestones
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="font-medium">
                  {milestone.label ?? milestone.name ?? `Jalon ${milestone.sequence_index}`}
                </p>
                <p className="text-sm text-slate-500">Échéance : {milestone.due_date ?? 'N/A'}</p>
              </div>
              {(() => {
                const badge = mapMilestoneStatusToBadge(milestone.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preuves</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {proofRequestMessage && (
            <div
              className={
                proofRequestMessage.tone === 'success'
                  ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
                  : proofRequestMessage.tone === 'info'
                    ? 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'
                    : 'rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'
              }
            >
              {proofRequestMessage.text}
            </div>
          )}
          {proofReviewActive && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Analyse en cours
            </div>
          )}
          {proofReviewError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {proofReviewError}
            </div>
          )}
          {summary.proofs.length === 0 && <p className="text-slate-600">Aucune preuve pour le moment.</p>}
          {summary.proofs.map((proof) => (
            <div key={proof.id} className="rounded-md border border-slate-100 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{proof.description ?? 'Preuve fournie'}</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const badge = mapProofStatusToBadge(proof.status);
                    return <Badge variant={badge.variant}>{badge.label}</Badge>;
                  })()}
                </div>
              </div>
              <p className="text-xs text-slate-500">{formatDateTime(proof.created_at)}</p>
              {(() => {
                const hasFile =
                  Boolean(proof.storage_key) ||
                  Boolean(proof.storage_url) ||
                  Boolean(proof.attachment_url) ||
                  Boolean(proof.file_url);
                if (!hasFile) return null;
                return <p className="text-sm text-slate-600">Fichier reçu.</p>;
              })()}
              <div className="mt-2 space-y-2">
                {onRequestAdvisorReview && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRequestAdvisorReview(proof.id)}
                      disabled={
                        proofRequestPendingId === proof.id ||
                        !canRequestAdvisorReview(proof, locallyRequestedProofIds)
                      }
                    >
                      {proofRequestPendingId === proof.id
                        ? 'Requesting...'
                        : 'Demander revue conseiller'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {proofForm && <div className="pt-2">{proofForm}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paiements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.payments.length === 0 && <p className="text-slate-600">Aucun paiement enregistré.</p>}
          {summary.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="font-medium">
                  {payment.amount} {payment.currency}
                </p>
                <p className="text-xs text-slate-500">{formatDateTime(payment.created_at)}</p>
              </div>
              {(() => {
                const badge = mapPaymentStatusToBadge(payment.status);
                return <Badge variant={badge.variant}>{badge.label}</Badge>;
              })()}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
