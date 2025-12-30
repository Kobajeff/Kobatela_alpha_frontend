'use client';

// Login page allowing the sender to request a token via email.
import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { getPortalDestination } from '@/lib/authIdentity';
import { getAuthToken, getAuthTokenEventName } from '@/lib/auth';
import { useAuthMe, useLogin } from '@/lib/queries/sender';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';
import { resetSession } from '@/lib/sessionReset';
import { useQueryClient } from '@tanstack/react-query';

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const login = useLogin();
  const { data: user, isLoading: isAuthLoading, isError, error: authError } = useAuthMe();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);

  const destination = getPortalDestination(user);
  const isAuthenticated = hasToken && Boolean(user);
  const isAtDestination =
    Boolean(destination?.path) && Boolean(pathname) && pathname.startsWith(destination.path);
  const canContinue = Boolean(destination?.path) && !isAtDestination;

  useEffect(() => {
    const updateTokenState = () => {
      setHasToken(Boolean(getAuthToken()));
    };

    updateTokenState();

    const tokenEventName = getAuthTokenEventName();
    window.addEventListener(tokenEventName, updateTokenState);
    window.addEventListener('storage', updateTokenState);
    return () => {
      window.removeEventListener(tokenEventName, updateTokenState);
      window.removeEventListener('storage', updateTokenState);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await login.mutateAsync({ email });
      const loginDestination = getPortalDestination(response.user ?? null);
      const fallbackDestination = loginDestination?.path ?? '/sender/dashboard';
      router.replace(fallbackDestination as Route);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const authErrorMessage = isError ? extractErrorMessage(authError) : null;

  return (
    <main>
      <div className="container max-w-md space-y-6 rounded-lg bg-white p-8 shadow">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Connexion</h1>
          <p className="text-slate-600">Accédez à votre espace expéditeur Kobatela.</p>
        </div>
        {isAuthenticated && (
          <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
            <p>
              Vous êtes déjà connecté en tant que{' '}
              <span className="font-semibold">
                {user?.email || user?.username} ({user?.role})
              </span>
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => {
                  if (destination?.path) {
                    router.replace(destination.path as Route);
                  }
                }}
                className="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Continuer vers mon espace
              </button>
              <button
                type="button"
                onClick={() => resetSession(queryClient, { redirectTo: '/login' })}
                className="rounded-md border border-indigo-200 px-3 py-2 text-indigo-900 hover:bg-indigo-100"
              >
                Se déconnecter / Changer de compte
              </button>
            </div>
          </div>
        )}
        {(login.isPending || (hasToken && isAuthLoading)) && (
          <LoadingState label="Loading…" fullHeight={false} />
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Adresse email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={login.isPending}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="vous@example.com"
            />
          </label>
          {authErrorMessage && <ErrorAlert message={authErrorMessage} />}
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
