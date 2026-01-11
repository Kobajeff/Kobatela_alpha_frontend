'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { SenderEscrowSummary } from '@/types/api';
import { formatDateTime } from '@/lib/format';
import {
  mapEscrowStatusToBadge,
  mapMilestoneStatusToBadge,
  mapPaymentStatusToBadge,
  mapProofStatusToBadge
} from '@/lib/uiMappings';

type ProviderEscrowDetailsProps = {
  summary: SenderEscrowSummary;
  proofForm?: ReactNode;
  proofReviewActive?: boolean;
  proofReviewError?: string | null;
};

export function ProviderEscrowDetails({
  summary,
  proofForm,
  proofReviewActive,
  proofReviewError
}: ProviderEscrowDetailsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.milestones.length === 0 && (
            <p className="text-slate-600">Aucun jalon enregistré.</p>
          )}
          {summary.milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="font-medium">
                  {milestone.label ?? `Jalon ${milestone.sequence_index}`}
                </p>
                <p className="text-sm text-slate-500">
                  Montant : {milestone.amount} {milestone.currency}
                </p>
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
          {summary.proofs.length === 0 && <p className="text-slate-600">Aucune preuve déposée.</p>}
          {summary.proofs.map((proof) => (
            <div key={proof.id} className="rounded-md border border-slate-100 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">Preuve #{proof.id}</p>
                {(() => {
                  const badge = mapProofStatusToBadge(proof.status);
                  return <Badge variant={badge.variant}>{badge.label}</Badge>;
                })()}
              </div>
              <p className="text-xs text-slate-500">{formatDateTime(proof.created_at)}</p>
              {(proof.storage_key || proof.storage_url) && (
                <p className="text-sm text-slate-600">Fichier reçu.</p>
              )}
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
                  {payment.amount}
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
