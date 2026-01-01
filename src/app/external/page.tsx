'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { clearExternalToken, readTokenFromQuery, setExternalToken } from '@/lib/external/externalSession';

export default function ExternalLandingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [inputToken, setInputToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const tokenFromUrl = useMemo(() => {
    if (!searchParams) return null;
    return readTokenFromQuery(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams) return;
    const error = searchParams.get('error');
    if (error === 'invalid_token') {
      setErrorMessage("Lien invalide ou expiré. Merci de saisir un nouveau jeton.");
    } else {
      setErrorMessage(null);
    }
  }, [searchParams]);

  useEffect(() => {
    if (tokenFromUrl) {
      setExternalToken(tokenFromUrl);
      setInputToken(tokenFromUrl);
      setInfoMessage('Jeton détecté dans le lien. Vous pouvez accéder directement au dossier.');
      router.replace('/external/escrow');
    } else {
      setInfoMessage(null);
    }
  }, [router, tokenFromUrl]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputToken) return;
    clearExternalToken();
    setExternalToken(inputToken);
    router.push('/external/escrow');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Portail bénéficiaire externe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            Suivez les étapes guidées pour accéder à votre dossier, déposer une preuve et suivre le
            statut. Munissez-vous du lien sécurisé ou du jeton transmis par l’expéditeur.
          </p>
          {errorMessage && <ErrorAlert message={errorMessage} />}
          {infoMessage && !errorMessage && <ErrorAlert message={infoMessage} />}
          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-800">
              Jeton sécurisé
              <span className="block text-xs font-normal text-slate-600">
                Collez le lien ou le jeton fourni dans l’email/SMS. Il est requis pour afficher le
                dossier.
              </span>
            </label>
            <Input
              value={inputToken}
              onChange={(event) => setInputToken(event.target.value.trim())}
              placeholder="Collez votre jeton ici"
              aria-label="Jeton sécurisé"
              required
            />
            <Button type="submit" className="w-full" disabled={!inputToken}>
              Accéder au dossier
            </Button>
          </form>
          <p className="text-xs text-slate-500">
            Le jeton reste uniquement dans cette session (aucun stockage permanent).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
