'use client';

// Detail view for a single escrow including milestones, proofs, and payments.
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProofAiStatus } from '@/components/sender/ProofAiStatus';
import { ForbiddenBanner } from '@/components/shared/ForbiddenBanner';
import { formatDateTime } from '@/lib/format';
import type { SenderEscrowSummary } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import {
  mapAiRiskToBadge,
  mapEscrowStatusToBadge,
  mapMilestoneStatusToBadge,
  mapPaymentStatusToBadge,
  mapProofStatusToBadge
} from '@/lib/uiMappings';

interface SenderEscrowDetailsProps {
  summary: SenderEscrowSummary;
  onMarkDelivered: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCheckDeadline: () => void;
  loading?: boolean;
  forbidden?: boolean;
  forbiddenTitle?: string;
  forbiddenSubtitle?: string;
  forbiddenCode?: string;
  proofForm?: ReactNode;
}

export function SenderEscrowDetails({
  summary,
  onApprove,
  onCheckDeadline,
  onMarkDelivered,
  onReject,
  loading,
  forbidden = false,
  forbiddenTitle,
  forbiddenSubtitle,
  forbiddenCode,
  proofForm
}: SenderEscrowDetailsProps) {
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
            <Button onClick={onMarkDelivered} disabled={loading || forbidden}>
              Marquer livré
            </Button>
            <Button variant="secondary" onClick={onApprove} disabled={loading}>
              Approuver
            </Button>
            <Button variant="danger" onClick={onReject} disabled={loading || forbidden}>
              Rejeter
            </Button>
            <Button variant="outline" onClick={onCheckDeadline} disabled={loading || forbidden}>
              Vérifier l'échéance
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jalons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="font-medium">{milestone.name}</p>
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
                  {proof.ai_checked_at && (() => {
                    const aiBadge = mapAiRiskToBadge(proof.ai_risk_level);
                    return <Badge variant={aiBadge.variant}>{aiBadge.label}</Badge>;
                  })()}
                </div>
              </div>
              <p className="text-xs text-slate-500">{formatDateTime(proof.created_at)}</p>
              {(() => {
                const attachmentLink = proof.attachment_url ?? proof.file_url;
                if (!attachmentLink) return null;
                return (
                  <a
                    href={attachmentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Consulter la pièce jointe
                  </a>
                );
              })()}
              <div className="mt-2 space-y-2">
                <ProofAiStatus proof={proof} />
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
