import type { ReactNode } from 'react';
import ExternalStepIndicator from '@/components/external/ExternalStepIndicator';

export default function ExternalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 space-y-2">
          <div className="text-lg font-semibold text-slate-900">
            Kobatela — Validation de preuve
          </div>
          <p className="text-sm text-slate-600">
            Utilisez le lien sécurisé transmis par l’expéditeur pour consulter votre dossier,
            déposer une preuve et suivre son traitement. Le jeton reste limité à cette session.
          </p>
          <ExternalStepIndicator />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
