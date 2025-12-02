export type BadgeIntent = 'neutral' | 'success' | 'warning' | 'danger' | 'muted';

const normalize = (value: string) => value?.toUpperCase?.() ?? '';

type BadgeMapping = { label: string; variant: BadgeIntent };

export function mapEscrowStatusToBadge(status: string): BadgeMapping {
  const normalized = normalize(status);

  switch (normalized) {
    case 'DRAFT':
      return { label: 'Brouillon', variant: 'neutral' };
    case 'FUNDED':
      return { label: 'Financé', variant: 'success' };
    case 'RELEASABLE':
      return { label: 'Prêt à libérer', variant: 'success' };
    case 'RELEASED':
      return { label: 'Libéré', variant: 'success' };
    case 'REFUNDED':
      return { label: 'Remboursé', variant: 'warning' };
    case 'CANCELLED':
      return { label: 'Annulé', variant: 'danger' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

export function mapMilestoneStatusToBadge(status: string): BadgeMapping {
  const normalized = normalize(status);

  switch (normalized) {
    case 'WAITING':
      return { label: 'En attente', variant: 'neutral' };
    case 'PENDING_REVIEW':
      return { label: 'En révision', variant: 'warning' };
    case 'APPROVED':
      return { label: 'Approuvé', variant: 'success' };
    case 'REJECTED':
      return { label: 'Rejeté', variant: 'danger' };
    case 'PAYING':
      return { label: 'Paiement en cours', variant: 'neutral' };
    case 'PAID':
      return { label: 'Payé', variant: 'success' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

export function mapPaymentStatusToBadge(status: string): BadgeMapping {
  const normalized = normalize(status);

  switch (normalized) {
    case 'PENDING':
      return { label: 'En attente', variant: 'neutral' };
    case 'SENT':
      return { label: 'Envoyé', variant: 'warning' };
    case 'SETTLED':
      return { label: 'Réglé', variant: 'success' };
    case 'ERROR':
      return { label: 'Erreur', variant: 'danger' };
    case 'REFUNDED':
      return { label: 'Remboursé', variant: 'warning' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

export function mapProofStatusToBadge(status: string): BadgeMapping {
  const normalized = normalize(status);

  switch (normalized) {
    case 'PENDING':
      return { label: 'En attente', variant: 'warning' };
    case 'APPROVED':
      return { label: 'Approuvée', variant: 'success' };
    case 'REJECTED':
      return { label: 'Rejetée', variant: 'danger' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

export function mapAiRiskToBadge(aiRisk: string | null | undefined): BadgeMapping {
  if (!aiRisk) {
    return { label: 'Risque faible', variant: 'neutral' };
  }

  const normalized = normalize(aiRisk);

  switch (normalized) {
    case 'WARNING':
      return { label: 'Alerte', variant: 'warning' };
    case 'SUSPECT':
      return { label: 'Suspect', variant: 'danger' };
    default:
      return { label: aiRisk, variant: 'neutral' };
  }
}
