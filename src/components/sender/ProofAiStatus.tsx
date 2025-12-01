import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/format';
import type { Proof } from '@/types/api';

const riskToVariant = (risk: string | null | undefined): 'default' | 'success' | 'warning' | 'destructive' => {
  if (!risk) return 'default';
  if (risk === 'LOW') return 'success';
  if (risk === 'MEDIUM') return 'warning';
  if (risk === 'HIGH') return 'destructive';
  return 'default';
};

type Props = {
  proof: Proof;
};

export function ProofAiStatus({ proof }: Props) {
  if (!proof.ai_checked_at) {
    return <p className="text-xs text-muted-foreground">AI analysis pending or disabled.</p>;
  }

  const risk = proof.ai_risk_level ?? 'UNKNOWN';
  const variant = riskToVariant(proof.ai_risk_level);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variant}>AI risk: {risk}</Badge>
        <span className="text-xs text-muted-foreground">checked at {formatDateTime(proof.ai_checked_at)}</span>
      </div>
      {proof.ai_explanation && (
        <p className="text-xs text-muted-foreground">{proof.ai_explanation}</p>
      )}
      {proof.ai_flags && proof.ai_flags.length > 0 && (
        <p className="text-xs text-muted-foreground">Flags: {proof.ai_flags.join(', ')}</p>
      )}
    </div>
  );
}
