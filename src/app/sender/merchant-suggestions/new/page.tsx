'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useCreateMerchantSuggestion } from '@/lib/queries/sender';
import { extractErrorMessage } from '@/lib/apiClient';

export default function NewMerchantSuggestionPage() {
  const router = useRouter();
  const [payloadText, setPayloadText] = useState('{}');
  const [parseError, setParseError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { mutate, isPending, error, reset } = useCreateMerchantSuggestion();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowSuccess(false);
    reset();

    try {
      const parsed = payloadText ? JSON.parse(payloadText) : {};
      setParseError(null);
      mutate(parsed, {
        onSuccess: (data) => {
          setShowSuccess(true);
          if (data?.id) {
            router.push(`/sender/merchant-suggestions/${data.id}`);
          }
        }
      });
    } catch (jsonError) {
      setParseError('Le contenu doit être un JSON valide.');
    }
  };

  const errorMessage = parseError ?? (error ? extractErrorMessage(error) : null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Nouvelle suggestion de commerçant</h1>
          <p className="text-sm text-slate-600">
            Collez un objet JSON décrivant le commerçant. Le payload sera envoyé tel quel au backend.
          </p>
        </div>
        <Link href="/sender/merchant-suggestions">
          <Button variant="outline">Retour à la liste</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payload JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Contenu JSON
              <textarea
                className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={10}
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
                placeholder='Exemple: {"name": "Commerçant", "city": "Kinshasa"}'
              />
            </label>

            {errorMessage && <ErrorAlert message={errorMessage} />}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Envoi...' : 'Envoyer la suggestion'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setPayloadText('{}');
                  setParseError(null);
                  setShowSuccess(false);
                  reset();
                }}
              >
                Réinitialiser
              </Button>
            </div>

            {showSuccess && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                Suggestion créée avec succès. Vous serez redirigé vers le détail si un identifiant est retourné.
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
