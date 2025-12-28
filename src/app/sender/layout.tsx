'use client';

// Layout guarding sender routes and wrapping them in the application shell.
import { AppShell } from '@/components/layout/AppShell';
import { RequireScope } from '@/components/system/RequireScope';

export default function SenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireScope
      anyScopes={['SENDER']}
      allowRoles={['sender', 'both']}
      loadingLabel="Chargement de votre espace expéditeur..."
    >
      <AppShell>{children}</AppShell>
    </RequireScope>
  );
}
