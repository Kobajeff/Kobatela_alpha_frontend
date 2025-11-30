'use client';

// Detail view for a single escrow including milestones, proofs, and payments.
import type { SenderEscrowSummary } from '@/types/api';

interface SenderEscrowDetailsProps {
  summary: SenderEscrowSummary;
  onMarkDelivered: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCheckDeadline: () => void;
  loading?: boolean;
}

export function SenderEscrowDetails({
  summary,
  onApprove,
  onCheckDeadline,
  onMarkDelivered,
  onReject,
  loading
}: SenderEscrowDetailsProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Escrow {summary.escrow.id}</h2>
            <p className="text-slate-600">Statut: {summary.escrow.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onMarkDelivered}
              disabled={loading}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Marquer livré
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={loading}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Approuver
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={loading}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              Rejeter
            </button>
            <button
              type="button"
              onClick={onCheckDeadline}
              disabled={loading}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Vérifier l'échéance
            </button>
          </div>
        </div>
        <p className="mt-4 text-slate-700">
          Montant : {summary.escrow.amount} {summary.escrow.currency}
        </p>
        <p className="text-slate-500">Créé le {new Date(summary.escrow.created_at).toLocaleString()}</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Jalons</h3>
        <div className="space-y-2">
          {summary.milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{milestone.name}</p>
                <p className="text-sm text-slate-500">Échéance : {milestone.due_date ?? 'N/A'}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {milestone.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Preuves</h3>
        <div className="space-y-2">
          {summary.proofs.length === 0 && <p className="text-slate-600">Aucune preuve pour le moment.</p>}
          {summary.proofs.map((proof) => (
            <div key={proof.id} className="rounded-md border border-slate-100 px-3 py-2">
              <p className="font-medium">{proof.description ?? 'Preuve fournie'}</p>
              <p className="text-xs text-slate-500">{new Date(proof.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Paiements</h3>
        <div className="space-y-2">
          {summary.payments.length === 0 && <p className="text-slate-600">Aucun paiement enregistré.</p>}
          {summary.payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <div>
                <p className="font-medium">{payment.amount} {payment.currency}</p>
                <p className="text-xs text-slate-500">{new Date(payment.created_at).toLocaleString()}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {payment.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
