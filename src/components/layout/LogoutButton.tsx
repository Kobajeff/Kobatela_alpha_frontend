'use client';

import { useLogout } from '@/lib/queries/sender';

export function LogoutButton({ className }: { className?: string }) {
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className ?? 'rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50'}
      disabled={logout.isPending}
    >
      {logout.isPending ? 'Déconnexion...' : 'Logout'}
    </button>
  );
}
