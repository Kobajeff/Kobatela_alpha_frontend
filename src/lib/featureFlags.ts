const truthyValues = new Set(['true']);

function envFlagEnabled(value?: string) {
  return truthyValues.has((value ?? '').toLowerCase());
}

export function opsAlertsEnabled(): boolean {
  return envFlagEnabled(process.env.NEXT_PUBLIC_FF_ADMIN_ALERTS);
}

export function opsRiskSnapshotsEnabled(): boolean {
  return envFlagEnabled(process.env.NEXT_PUBLIC_FF_ADMIN_RISK_SNAPSHOTS);
}

export function opsFraudScoreComparisonEnabled(): boolean {
  return envFlagEnabled(process.env.NEXT_PUBLIC_FF_ADMIN_FRAUD_SCORE_COMPARISON);
}

export function opsTransactionsEnabled(): boolean {
  return envFlagEnabled(process.env.NEXT_PUBLIC_FF_ADMIN_TRANSACTIONS);
}

export function opsSpendEnabled(): boolean {
  return envFlagEnabled(process.env.NEXT_PUBLIC_FF_ADMIN_SPEND);
}

export function opsBeneficiaryLookupEnabled(): boolean {
  return envFlagEnabled(process.env.NEXT_PUBLIC_FF_ADMIN_BENEFICIARY_LOOKUP);
}

export function opsKctPublicEnabled(): boolean {
  return envFlagEnabled(process.env.NEXT_PUBLIC_FF_ADMIN_KCT_PUBLIC);
}
