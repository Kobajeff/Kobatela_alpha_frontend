import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/format';
import type { AiAnalysis } from '@/types/api';

const riskToVariant = (risk: string | null | undefined): 'default' | 'success' | 'warning' | 'danger' => {
  if (!risk) return 'default';
  if (risk === 'LOW') return 'success';
  if (risk === 'MEDIUM') return 'warning';
  if (risk === 'HIGH') return 'danger';
  return 'default';
};

type Props = {
  proof: AiAnalysis & { status?: string };
  compact?: boolean;
};

const formatScore = (value: AiAnalysis['ai_score']): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') return value.toFixed(2);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : String(value);
};

export function ProofAiStatus({ proof, compact = false }: Props) {
  if (!proof.ai_checked_at) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="default">Analyse IA</Badge>
        <span>{proof.status === 'pending' ? 'En attente de l’analyse IA…' : 'Analyse IA non disponible'}</span>
      </div>
    );
  }

  const risk = proof.ai_risk_level ?? 'UNKNOWN';
  const variant = riskToVariant(proof.ai_risk_level);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
        <Badge variant={variant}>
          Analyse IA · Risque : {risk}
        </Badge>
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
      {!compact && proof.ai_flags && proof.ai_flags.length > 0 && (
        <p className="text-xs text-muted-foreground">Signaux : {proof.ai_flags.join(', ')}</p>
      )}
    </div>
  );
}
