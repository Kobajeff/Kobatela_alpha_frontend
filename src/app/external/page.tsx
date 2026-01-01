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
  const tokenFromUrl = useMemo(() => {
    if (!searchParams) return null;
    return readTokenFromQuery(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams) return;
    const error = searchParams.get('error');
    if (error === 'invalid_token') {
      setErrorMessage("Lien invalide ou expiré. Merci de saisir un nouveau jeton.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (tokenFromUrl) {
      setExternalToken(tokenFromUrl);
      setInputToken(tokenFromUrl);
      router.replace('/external');
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
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Portail bénéficiaire externe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <p>
              Accédez à votre dossier à l’aide du jeton transmis par l’expéditeur. Vous pourrez
              consulter le récapitulatif de l&apos;escrow, déposer des preuves et suivre leur statut.
            </p>
            {errorMessage && <ErrorAlert message={errorMessage} />}
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-800">
                Jeton sécurisé (copiez le lien ou le jeton fourni)
              </label>
              <Input
                value={inputToken}
                onChange={(event) => setInputToken(event.target.value.trim())}
                placeholder="Collez votre jeton ici"
              />
              <Button type="submit" className="w-full" disabled={!inputToken}>
                Accéder à mon dossier
              </Button>
            </form>
            <p className="text-xs text-slate-500">
              Nous ne stockons pas le jeton au-delà de votre session actuelle.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
