import type { EscrowViewerContext } from '@/types/api';

export function canAction(
  ctx: EscrowViewerContext | null | undefined,
  action: string
): boolean {
  if (!ctx || !Array.isArray(ctx.allowed_actions)) return false;
  return ctx.allowed_actions.includes(action);
}
