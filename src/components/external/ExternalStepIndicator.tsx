'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

const steps = [
  { label: '1. Lien sécurisé' },
  { label: '2. Résumé du dossier' },
  { label: '3. Dépôt du fichier' },
  { label: '4. Soumission' },
  { label: '5. Suivi du statut' }
];

function resolveStep(pathname: string | null): number {
  if (!pathname) return 1;
  if (pathname === '/external') return 1;
  if (pathname.startsWith('/external/escrow')) return 2;
  if (pathname.startsWith('/external/proofs/upload')) return 3;
  if (pathname.startsWith('/external/proofs/') && !pathname.endsWith('/upload')) return 5;
  if (pathname.startsWith('/external/proofs')) return 4;
  return 1;
}

export function ExternalStepIndicator() {
  const pathname = usePathname();
  const activeStep = useMemo(() => resolveStep(pathname), [pathname]);

  return (
    <div className="flex flex-wrap gap-2 text-xs sm:text-sm" aria-label="Progression du parcours">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === activeStep;
        return (
          <div
            key={step.label}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
              isActive
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {stepNumber}
            </span>
            <span className="font-medium">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default ExternalStepIndicator;
