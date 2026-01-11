'use client';

// Login page allowing the sender to request a token via email.
import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { extractErrorMessage } from '@/lib/apiClient';
import { getPortalDestination } from '@/lib/authIdentity';
import { getAuthToken, getAuthTokenEventName } from '@/lib/auth';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthMe, useLogin } from '@/lib/queries/sender';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const login = useLogin();
  const { data: user, isLoading: isAuthLoading, isError, error: authError } = useAuthMe();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);

  const destination = getPortalDestination(user);
  const isAuthenticated = hasToken && Boolean(user);

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

  useEffect(() => {
    if (!isAuthenticated || !destination?.path) return;
    router.replace(destination.path as Route);
  }, [destination?.path, isAuthenticated, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await login.mutateAsync({ email });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      await queryClient.refetchQueries({ queryKey: queryKeys.auth.me() });
      const loginDestination = getPortalDestination(response.user ?? null);
      const fallbackDestination = loginDestination?.path ?? '/dashboard';
      router.replace(fallbackDestination as Route);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const authErrorMessage = isError ? extractErrorMessage(authError) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white">
              KCT
            </div>
            <span className="text-2xl font-semibold text-slate-700">Kobatela</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-700">Connexion à votre compte</h1>
        </div>
        {(login.isPending || (hasToken && isAuthLoading)) && (
          <div className="mt-6">
            <LoadingState label="Chargement…" fullHeight={false} />
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Adresse e-mail
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
                  <path d="m22 8-8.97 5.7a2 2 0 0 1-2.06 0L2 8" />
                </svg>
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={login.isPending}
                className="w-full rounded-lg border border-slate-200 py-2 pl-11 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Entrez votre adresse e-mail"
                autoComplete="email"
              />
            </div>
          </label>
          {authErrorMessage && <ErrorAlert message={authErrorMessage} />}
          {error && <ErrorAlert message={error} />}
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {login.isPending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Besoin d&apos;aide ?{' '}
          <a
            href="mailto:support@kobatela.com"
            className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
          >
            Contactez le support
          </a>
        </p>
      </div>
    </main>
  );
}
