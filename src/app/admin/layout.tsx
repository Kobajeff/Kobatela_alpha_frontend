'use client';

// Layout guarding admin routes and providing the admin chrome.
import { AdminShell } from '@/components/layout/AdminShell';
import { RequireScope } from '@/components/system/RequireScope';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireScope
      anyScopes={['ADMIN', 'SUPPORT']}
      loadingLabel="Vérification de l'accès administrateur..."
    >
      {(user) => <AdminShell user={user}>{children}</AdminShell>}
    </RequireScope>
  );
}
