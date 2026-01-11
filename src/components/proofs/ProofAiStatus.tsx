import { Badge } from '@/components/ui/Badge';
import { mapAiRiskToBadge } from '@/lib/uiMappings';
import type { ProofUI } from '@/types/ui';

type ProofAiStatusData = Pick<
  ProofUI,
  'status' | 'ai_checked_at' | 'ai_risk_level' | 'ai_score' | 'ai_explanation'
>;

type Props = {
  proof: ProofAiStatusData;
  compact?: boolean;
};

export function ProofAiStatus({ proof, compact }: Props) {
  const { status, ai_checked_at, ai_risk_level, ai_score, ai_explanation } = proof;

  const normalizedStatus = status?.toString().toUpperCase();

  if (!ai_checked_at && normalizedStatus === 'PENDING') {
    return <p className="text-xs text-muted-foreground">Waiting for AI analysis.</p>;
  }

  if (!ai_checked_at) {
    return <p className="text-xs text-muted-foreground">AI analysis not available.</p>;
  }

  const aiBadge = mapAiRiskToBadge(ai_risk_level);
  
  const scoreText =
    ai_score !== null && ai_score !== undefined
      ? `Score: ${typeof ai_score === 'number' ? ai_score.toFixed(2) : ai_score}`
      : null;

  if (compact) {
    return (
      <div className="space-y-0.5 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant={aiBadge.variant}>AI risk: {aiBadge.label}</Badge>
          {scoreText && <span className="text-muted-foreground">{scoreText}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-md bg-slate-50 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={aiBadge.variant}>AI risk: {aiBadge.label}</Badge>
        {scoreText && <span className="text-muted-foreground">{scoreText}</span>}
        <span className="text-[10px] text-muted-foreground">
          Checked at {new Date(ai_checked_at).toLocaleString()}
        </span>
      </div>
      {ai_explanation && <p className="text-[11px] text-slate-700">{ai_explanation}</p>}
    </div>
  );
}
