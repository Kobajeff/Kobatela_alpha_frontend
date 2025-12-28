'use client';

// Layout guarding advisor routes and providing advisor chrome.
import { AdvisorShell } from '@/components/layout/AdvisorShell';
import { RequireScope } from '@/components/system/RequireScope';

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireScope
      anyScopes={['ADVISOR']}
      allowRoles={['advisor', 'admin', 'support', 'both']}
      loadingLabel="Vérification de l'accès conseiller..."
    >
      <AdvisorShell>{children}</AdvisorShell>
    </RequireScope>
  );
}
