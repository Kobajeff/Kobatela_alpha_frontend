'use client';

// Login page allowing the sender to request a token via email.
import { useEffect, useRef, useState } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { extractErrorMessage } from '@/lib/apiClient';
import { getPortalDestination } from '@/lib/authIdentity';
import { getAuthToken, getAuthTokenEventName } from '@/lib/auth';
import { useAuthMe, useLogin } from '@/lib/queries/sender';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingState } from '@/components/common/LoadingState';

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const login = useLogin();
  const { data: user, isLoading: isAuthLoading } = useAuthMe();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const didRedirectRef = useRef(false);

  const destination = getPortalDestination(user);
  const isAtDestination =
    Boolean(destination?.path) && Boolean(pathname) && pathname.startsWith(destination.path);
  const shouldRedirect =
    mounted && hasToken && Boolean(user) && Boolean(destination?.path) && !isAtDestination;

  useEffect(() => {
    setMounted(true);

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
    if (!shouldRedirect || !destination || didRedirectRef.current) {
      return;
    }
    didRedirectRef.current = true;
    router.replace(destination.path as Route);
  }, [destination, router, shouldRedirect]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email });
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  if (!mounted) {
    return <LoadingState label="Loading…" fullHeight={false} />;
  }

  if (shouldRedirect) {
    return <LoadingState label="Redirection…" fullHeight={false} />;
  }

  return (
    <main>
      <div className="container max-w-md space-y-6 rounded-lg bg-white p-8 shadow">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Connexion</h1>
          <p className="text-slate-600">Accédez à votre espace expéditeur Kobatela.</p>
        </div>
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
