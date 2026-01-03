import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/common/ErrorAlert';

type OpsErrorStateProps = {
  error?: unknown;
  statusCode?: number | null;
  onRetry?: () => void;
  retryLabel?: string;
  fallbackMessage?: string;
};

function resolveStatus(error?: unknown, explicit?: number | null) {
  if (explicit) return explicit;
  if (isAxiosError(error)) {
    return error.response?.status;
  }
  return null;
}

export function OpsErrorState({
  error,
  statusCode,
  onRetry,
  retryLabel = 'Réessayer',
  fallbackMessage
}: OpsErrorStateProps) {
  const resolvedStatus = resolveStatus(error, statusCode);

  let message = fallbackMessage ?? 'Service indisponible pour le moment. Merci de réessayer.';
  if (resolvedStatus === 401) {
    message = 'Authentification requise. Veuillez vous reconnecter.';
  } else if (resolvedStatus === 403) {
    message = 'Accès refusé : cette page est réservée aux scopes admin/support.';
  } else if (resolvedStatus === 404) {
    message = 'Ressource introuvable. Vérifiez l’identifiant ou les filtres.';
  } else if (resolvedStatus === 400 || resolvedStatus === 422) {
    message = 'Requête invalide. Vérifiez vos paramètres puis réessayez.';
  }

  return (
    <div className="space-y-3 rounded-md border border-red-100 bg-red-50 p-4">
      <ErrorAlert message={message} />
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
