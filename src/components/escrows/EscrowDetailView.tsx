'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';
import {
  mapMilestoneStatusToBadge,
  mapPaymentStatusToBadge,
  mapProofStatusToBadge
} from '@/lib/uiMappings';
import { canAction } from '@/policy/allowedActions';
import type { SenderEscrowSummaryUI } from '@/types/ui';

const ACTION_LABELS: Record<string, string> = {
  VIEW_SUMMARY: 'Voir le résumé',
  VIEW_MILESTONES: 'Voir les étapes',
  VIEW_PROOFS: 'Voir les preuves',
  ACTIVATE_ESCROW: "Activer l'escrow",
  FUND_ESCROW: 'Financer l’escrow',
  EDIT_MILESTONES: 'Modifier les étapes',
  EDIT_FRAUD_CONFIG_ESCROW: 'Modifier la config fraude',
  EDIT_FRAUD_CONFIG_MILESTONE: 'Modifier la config fraude (étape)',
  MARK_DELIVERED: 'Marquer comme livré',
  CLIENT_APPROVE: 'Approuver',
  CLIENT_REJECT: 'Rejeter',
  CHECK_DEADLINE: "Vérifier l’échéance",
  DECIDE_PROOF: 'Décider la preuve',
  REQUEST_ADVISOR_REVIEW: 'Demander revue conseiller',
  UPLOAD_PROOF_FILE: 'Téléverser une preuve',
  SUBMIT_PROOF: 'Soumettre une preuve'
};

type EscrowDetailViewProps = {
  summary: SenderEscrowSummaryUI;
  portalMode: 'sender' | 'provider';
  onMarkDelivered?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  actionsDisabled?: boolean;
  proofForm?: ReactNode;
  proofReviewActive?: boolean;
  proofReviewError?: string | null;
};

type TabKey = 'milestones' | 'proofs' | 'payments';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'milestones', label: 'ÉTAPES' },
  { key: 'proofs', label: 'PREUVES' },
  { key: 'payments', label: 'PAIEMENTS' }
];

export function EscrowDetailView({
  summary,
  portalMode,
  onMarkDelivered,
  onApprove,
  onReject,
  actionsDisabled,
  proofForm,
  proofReviewActive,
  proofReviewError
}: EscrowDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('milestones');
  const viewerContext = summary.viewer_context;
  const escrow = summary.escrow;
  const currentMilestone = useMemo(() => {
    if (
      summary.current_submittable_milestone_idx !== null &&
      summary.current_submittable_milestone_idx !== undefined
    ) {
      return summary.milestones.find(
        (milestone) => milestone.sequence_index === summary.current_submittable_milestone_idx
      );
    }
    if (
      summary.current_submittable_milestone_id !== null &&
      summary.current_submittable_milestone_id !== undefined
    ) {
      return summary.milestones.find(
        (milestone) =>
          String(milestone.id) === String(summary.current_submittable_milestone_id)
      );
    }
    return null;
  }, [
    summary.current_submittable_milestone_id,
    summary.current_submittable_milestone_idx,
    summary.milestones
  ]);

  const currentMilestoneLabel =
    currentMilestone?.label ??
    (summary.current_submittable_milestone_idx !== null &&
    summary.current_submittable_milestone_idx !== undefined
      ? `Étape ${summary.current_submittable_milestone_idx}`
      : '—');

  const allowedActions = viewerContext.allowed_actions ?? [];
  const allowedActionsLabel = allowedActions.length
    ? allowedActions.map((action) => ACTION_LABELS[action] ?? action).join(', ')
    : '—';

  const canMarkDelivered = Boolean(
    onMarkDelivered && canAction(viewerContext, 'MARK_DELIVERED')
  );
  const canApprove = Boolean(onApprove && canAction(viewerContext, 'CLIENT_APPROVE'));
  const canReject = Boolean(onReject && canAction(viewerContext, 'CLIENT_REJECT'));
  const showActionBar = canMarkDelivered || canApprove || canReject;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Détail de l’escrow</h1>
          <p className="text-sm text-slate-600">Escrow ID: {escrow.id}</p>
          <div>
            <StatusBadge type="escrow" status={escrow.status} />
          </div>
        </div>
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-2">
            <div className="text-sm text-slate-500">Montant total</div>
            <div className="text-lg font-semibold text-slate-900">
              {escrow.amount_total} {escrow.currency}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>État de l’escrow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Statut</span>
              <StatusBadge type="escrow" status={escrow.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Échéance</span>
              <span className="font-medium">
                {escrow.deadline_at ? formatDateTime(escrow.deadline_at) : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Étape actuelle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{currentMilestoneLabel}</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Statut</span>
              {currentMilestone?.status ? (
                (() => {
                  const badge = mapMilestoneStatusToBadge(currentMilestone.status);
                  return <Badge variant={badge.variant}>{badge.label}</Badge>;
                })()
              ) : (
                <Badge variant="neutral">—</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accès visualiseur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Relation</span>
              <span className="font-medium">{viewerContext.relation}</span>
            </div>
            <div>
              <span className="text-slate-500">Actions autorisées</span>
              <div className="mt-1 font-medium text-slate-800">{allowedActionsLabel}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-2 text-sm font-semibold',
              activeTab === tab.key
                ? 'border-b-2 border-indigo-600 text-indigo-700'
                : 'text-slate-500 hover:text-slate-700'
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'milestones' && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {summary.milestones.length === 0 ? (
                <p className="text-sm text-slate-600">Aucune étape enregistrée.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 text-left text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Milestone</th>
                      <th className="py-2 pr-4">Montant</th>
                      <th className="py-2 pr-4">Séquence</th>
                      <th className="py-2 pr-4">Statut</th>
                      <th className="py-2">Preuve</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.milestones.map((milestone) => (
                      <tr key={milestone.id}>
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {milestone.label}
                        </td>
                        <td className="py-3 pr-4">
                          {milestone.amount} {milestone.currency}
                        </td>
                        <td className="py-3 pr-4">{milestone.sequence_index}</td>
                        <td className="py-3 pr-4">
                          {(() => {
                            const badge = mapMilestoneStatusToBadge(milestone.status);
                            return <Badge variant={badge.variant}>{badge.label}</Badge>;
                          })()}
                        </td>
                        <td className="py-3">{milestone.proof_kind ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Paiements</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {summary.payments.length === 0 ? (
                <p className="text-sm text-slate-600">Aucun paiement enregistré.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 text-left text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Paiement</th>
                      <th className="py-2 pr-4">Montant</th>
                      <th className="py-2 pr-4">Statut</th>
                      <th className="py-2">Dates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="py-3 pr-4 font-medium text-slate-900">#{payment.id}</td>
                        <td className="py-3 pr-4">{payment.amount}</td>
                        <td className="py-3 pr-4">
                          {(() => {
                            const badge = mapPaymentStatusToBadge(payment.status);
                            return <Badge variant={badge.variant}>{badge.label}</Badge>;
                          })()}
                        </td>
                        <td className="py-3 text-xs text-slate-500">
                          <div>{formatDateTime(payment.created_at)}</div>
                          <div>{formatDateTime(payment.updated_at)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'proofs' && (
        <Card>
          <CardHeader>
            <CardTitle>Preuves</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            {summary.proofs.length === 0 ? (
              <p className="text-sm text-slate-600">
                {portalMode === 'provider'
                  ? 'Aucune preuve déposée pour cet escrow.'
                  : 'Aucune preuve déposée.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 text-left text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Statut</th>
                      <th className="py-2 pr-4">Création</th>
                      <th className="py-2">Fichier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.proofs.map((proof) => (
                      <tr key={proof.id}>
                        <td className="py-3 pr-4 font-medium text-slate-900">{proof.type}</td>
                        <td className="py-3 pr-4">
                          {(() => {
                            const badge = mapProofStatusToBadge(proof.status);
                            return <Badge variant={badge.variant}>{badge.label}</Badge>;
                          })()}
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-500">
                          {formatDateTime(proof.created_at)}
                        </td>
                        <td className="py-3">
                          {proof.storage_url ? (
                            <a
                              href={proof.storage_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-indigo-600 hover:underline"
                            >
                              Voir
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {proofForm && <div className="pt-2">{proofForm}</div>}
          </CardContent>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <CardHeader>
            <CardTitle>Paiements</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {summary.payments.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun paiement enregistré.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Paiement</th>
                    <th className="py-2 pr-4">Montant</th>
                    <th className="py-2 pr-4">Statut</th>
                    <th className="py-2">Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-3 pr-4 font-medium text-slate-900">#{payment.id}</td>
                      <td className="py-3 pr-4">{payment.amount}</td>
                      <td className="py-3 pr-4">
                        {(() => {
                          const badge = mapPaymentStatusToBadge(payment.status);
                          return <Badge variant={badge.variant}>{badge.label}</Badge>;
                        })()}
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        <div>{formatDateTime(payment.created_at)}</div>
                        <div>{formatDateTime(payment.updated_at)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {showActionBar && (
        <div className="flex flex-wrap justify-end gap-3">
          {canMarkDelivered && (
            <Button onClick={onMarkDelivered} disabled={actionsDisabled}>
              Marquer comme livré
            </Button>
          )}
          {canApprove && (
            <Button
              onClick={onApprove}
              disabled={actionsDisabled}
              className="bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500"
            >
              Approuver
            </Button>
          )}
          {canReject && (
            <Button variant="danger" onClick={onReject} disabled={actionsDisabled}>
              Rejeter
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
