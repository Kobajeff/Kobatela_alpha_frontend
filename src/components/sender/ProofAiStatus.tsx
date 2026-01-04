import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/format';
import type { AiAnalysis } from '@/types/api';
import { mapAiRiskToBadge } from '@/lib/uiMappings';
import { useAuthMe } from '@/lib/queries/sender';
import { canViewSensitiveProofFields } from '@/lib/authIdentity';

type Props = {
  proof: AiAnalysis & { status?: string };
  compact?: boolean;
};

const formatScore = (value: AiAnalysis['ai_score']): string => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'string') return value;
  return value.toFixed(2);
};

export function ProofAiStatus({ proof, compact = false }: Props) {
  const { data: user } = useAuthMe();
  const canViewAi = canViewSensitiveProofFields(user ?? null);

  if (!canViewAi) {
    return null;
  }

  if (!proof.ai_checked_at) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="neutral">Analyse IA</Badge>
        <span>
          {proof.status?.toUpperCase?.() === 'PENDING'
            ? 'En attente de l’analyse IA…'
            : 'Analyse IA non disponible'}
        </span>
      </div>
    );
  }

  const { label, variant } = mapAiRiskToBadge(proof.ai_risk_level);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
        <Badge variant={variant}>Analyse IA · {label}</Badge>
        <Badge variant="outline">Score : {formatScore(proof.ai_score)}</Badge>
        <span className="text-[11px] text-muted-foreground">
          Vérifiée le {formatDateTime(proof.ai_checked_at)}
        </span>
      </div>
      {!compact && proof.ai_explanation && (
        <p className="text-xs text-muted-foreground" title={proof.ai_explanation}>
          {proof.ai_explanation}
        </p>
      )}
    </div>
  );
}
