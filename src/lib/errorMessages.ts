import type { NormalizedApiError } from './apiError';

const STATUS_MESSAGES: Record<number, string> = {
  404: 'Ressource introuvable / indisponible.',
  410: 'Ressource indisponible (ancienne route).',
  409: 'Conflit détecté. Rafraîchissez les données puis réessayez.',
  422: 'Données invalides ou séquence non permise. Vérifiez et réessayez.'
};

const CODE_MESSAGES: Record<string, string> = {
  INSUFFICIENT_SCOPE: 'Action non autorisée.'
};

export function getApiErrorMessage(error: NormalizedApiError): string | null {
  if (error.code && CODE_MESSAGES[error.code]) {
    return CODE_MESSAGES[error.code];
  }

  if (typeof error.status === 'number' && STATUS_MESSAGES[error.status]) {
    return STATUS_MESSAGES[error.status];
  }

  return null;
}
