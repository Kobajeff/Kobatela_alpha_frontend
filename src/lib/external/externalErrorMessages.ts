import { normalizeApiError, type NormalizedApiError } from '../apiError';

const DEFAULT_EXTERNAL_ERROR = 'Une erreur est survenue. Réessayez.';

function mapFromNormalized(error: NormalizedApiError): string {
  const status = error.status;
  const code = error.code;

  if (code === 'UNSUPPORTED_FILE_TYPE') {
    return 'Type de fichier non supporté.';
  }

  if (code === 'FILE_TOO_LARGE') {
    return 'Fichier trop volumineux. Réduisez la taille ou choisissez un autre fichier.';
  }

  if (code === 'PROOF_NOT_FOUND') {
    return 'Preuve introuvable pour ce lien sécurisé.';
  }

  if (status === 401) {
    return 'Lien invalide ou expiré. Demandez un nouveau lien à l’expéditeur.';
  }

  if (status === 403) {
    return 'Accès refusé pour ce lien. Vérifiez que vous utilisez le bon lien.';
  }

  if (status === 404) {
    return 'Dossier introuvable. Vérifiez le lien ou contactez l’expéditeur.';
  }

  if (status === 410) {
    return 'Ce lien a expiré ou a déjà été utilisé.';
  }

  if (status === 413) {
    return 'Fichier trop volumineux. Réduisez la taille ou choisissez un autre fichier.';
  }

  if (status === 415) {
    return 'Type de fichier non supporté.';
  }

  if (status === 429) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }

  return DEFAULT_EXTERNAL_ERROR;
}

export function mapExternalErrorMessage(error: unknown): string {
  const normalized = normalizeApiError(error);
  const mapped = mapFromNormalized(normalized);
  if (mapped !== DEFAULT_EXTERNAL_ERROR) return mapped;
  return normalized.message || DEFAULT_EXTERNAL_ERROR;
}
