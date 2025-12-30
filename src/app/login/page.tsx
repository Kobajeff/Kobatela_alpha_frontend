'use client';

// Login page allowing the sender to request a token via email.
import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { getPortalDestination } from '@/lib/authIdentity';
import { useAuthMe, useLogin } from '@/lib/queries/sender';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const { data: user, isLoading: isAuthLoading } = useAuthMe();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const destination = getPortalDestination(user);

  useEffect(() => {
    if (destination) {
      router.replace(destination.path as Route);
    }
  }, [destination, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email });
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <main>
      <div className="container max-w-md space-y-6 rounded-lg bg-white p-8 shadow">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Connexion</h1>
          <p className="text-slate-600">Accédez à votre espace expéditeur Kobatela.</p>
        </div>
        {(login.isPending || isAuthLoading) && (
          <LoadingState label="Connexion en cours..." fullHeight={false} />
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Adresse email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="vous@example.com"
            />
          </label>
          {error && <ErrorAlert message={error} />}
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {login.isPending ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  );
}
