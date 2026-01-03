type MaskMode = 'last4' | 'email' | 'phone' | 'iban' | 'account';

function maskEmail(value: string) {
  const [local, domain] = value.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return `***${last4 ? `-${last4}` : ''}`;
}

function maskIban(value: string) {
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)} **** **** ${value.slice(-4)}`;
}

function maskAccount(value: string) {
  if (value.length <= 6) return '***';
  return `${value.slice(0, 2)}***${value.slice(-4)}`;
}

export function MaskedValue({ value, mode }: { value?: string | null; mode: MaskMode }) {
  if (!value) return <>—</>;
  const stringValue = String(value);
  let masked = '***';

  if (mode === 'last4') {
    masked = stringValue.length > 4 ? `***${stringValue.slice(-4)}` : '***';
  } else if (mode === 'email') {
    masked = maskEmail(stringValue);
  } else if (mode === 'phone') {
    masked = maskPhone(stringValue);
  } else if (mode === 'iban') {
    masked = maskIban(stringValue);
  } else if (mode === 'account') {
    masked = maskAccount(stringValue);
  }

  return <>{masked}</>;
}
