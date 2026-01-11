export type LegacyEscrowStatus = {
  status?: string;
  escrow_status?: string;
};

export function getEscrowStatus(input: LegacyEscrowStatus): string | undefined {
  return input.status ?? input.escrow_status;
}

export function normalizeEscrow<T extends object>(obj: T): T & { status?: string } {
  const status = getEscrowStatus(obj as LegacyEscrowStatus);
  if (status === undefined) {
    return { ...obj } as T & { status?: string };
  }
  return { ...obj, status };
}
