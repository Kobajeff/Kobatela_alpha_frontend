const truthyValues = new Set(['true']);

export function isAdminAlertsEnabled(): boolean {
  return truthyValues.has((process.env.NEXT_PUBLIC_FF_ADMIN_ALERTS ?? '').toLowerCase());
}

export function isAdminRiskSnapshotsEnabled(): boolean {
  return truthyValues.has((process.env.NEXT_PUBLIC_FF_ADMIN_RISK_SNAPSHOTS ?? '').toLowerCase());
}
