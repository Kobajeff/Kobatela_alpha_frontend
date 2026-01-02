const truthyValues = new Set(['true']);

export function isAdminAlertsEnabled(): boolean {
  return truthyValues.has((process.env.NEXT_PUBLIC_FF_ADMIN_ALERTS ?? '').toLowerCase());
}

export function isAdminRiskSnapshotsEnabled(): boolean {
  return truthyValues.has((process.env.NEXT_PUBLIC_FF_ADMIN_RISK_SNAPSHOTS ?? '').toLowerCase());
}

export function isAdminFraudScoreComparisonEnabled(): boolean {
  return truthyValues.has(
    (process.env.NEXT_PUBLIC_FF_ADMIN_FRAUD_SCORE_COMPARISON ?? '').toLowerCase()
  );
}

export function isAdminTransactionsEnabled(): boolean {
  return truthyValues.has((process.env.NEXT_PUBLIC_FF_ADMIN_TRANSACTIONS ?? '').toLowerCase());
}

export function isAdminSpendEnabled(): boolean {
  return truthyValues.has((process.env.NEXT_PUBLIC_FF_ADMIN_SPEND ?? '').toLowerCase());
}
