'use client';

import { useRouter } from 'next/navigation';
import { useLogout } from '@/lib/queries/sender';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        router.push('/login');
      }
    });
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
