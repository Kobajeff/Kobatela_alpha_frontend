'use client';

import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';
import { useMyProfile } from '@/lib/queries/sender';

export default function SenderProfilePage() {
  const { data, isLoading, isError, error } = useMyProfile();

  if (isLoading) {
    return <LoadingState label="Chargement de votre profil..." />;
  }

  if (isError) {
    return <ErrorAlert message={extractErrorMessage(error)} />;
  }

  if (!data) {
    return <ErrorAlert message="Impossible de charger votre profil." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Mon profil</h1>
        <p className="text-sm text-muted-foreground">Informations liées à votre compte Kobatela.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{data.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Nom d'utilisateur</span>
            <span className="font-medium">{data.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rôle</span>
            <span className="font-medium">{data.role}</span>
          </div>
          {data.payout_channel && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Canal de paiement</span>
              <span className="font-medium">{data.payout_channel}</span>
            </div>
          )}
          {data.created_at && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Créé le</span>
              <span className="font-medium">{new Date(data.created_at).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
