import type { Proof } from '@/types/api';

type Props = {
  proof: Proof;
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

  const risk = (ai_risk_level ?? 'UNKNOWN').toString().toUpperCase();
  let riskLabel = risk;
  let badgeClass =
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';

  if (risk === 'LOW') {
    badgeClass += ' bg-emerald-100 text-emerald-800';
    riskLabel = 'Low';
  } else if (risk === 'MEDIUM') {
    badgeClass += ' bg-amber-100 text-amber-800';
    riskLabel = 'Medium';
  } else if (risk === 'HIGH') {
    badgeClass += ' bg-red-100 text-red-800';
    riskLabel = 'High';
  } else {
    badgeClass += ' bg-slate-100 text-slate-700';
    riskLabel = 'Unknown';
  }

  const scoreText =
    ai_score !== null && ai_score !== undefined
      ? `Score: ${typeof ai_score === 'number' ? ai_score.toFixed(2) : ai_score}`
      : null;

  if (compact) {
    return (
      <div className="space-y-0.5 text-xs">
        <div className="flex items-center gap-2">
          <span className={badgeClass}>AI risk: {riskLabel}</span>
          {scoreText && <span className="text-muted-foreground">{scoreText}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-md bg-slate-50 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className={badgeClass}>AI risk: {riskLabel}</span>
        {scoreText && <span className="text-muted-foreground">{scoreText}</span>}
        <span className="text-[10px] text-muted-foreground">
          Checked at {new Date(ai_checked_at).toLocaleString()}
        </span>
      </div>
      {ai_explanation && <p className="text-[11px] text-slate-700">{ai_explanation}</p>}
    </div>
  );
}
