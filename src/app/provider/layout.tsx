'use client';

// Layout guarding provider routes and wrapping them in a basic container.
import { RequireScope } from '@/components/system/RequireScope';

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireScope anyScopes={['PROVIDER']} loadingLabel="Chargement de votre espace prestataire...">
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl space-y-6">{children}</div>
      </div>
    </RequireScope>
  );
}
