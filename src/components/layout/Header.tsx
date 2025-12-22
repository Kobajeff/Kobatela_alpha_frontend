'use client';

// Header component displaying the Kobatela brand and current user info.
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthMe } from '@/lib/queries/sender';
import { getDemoRole, isDemoMode, setDemoRole } from '@/lib/config';
import { useToast } from '@/components/ui/ToastProvider';
import { AuthUser } from '@/types/api';
import { LogoutButton } from './LogoutButton';

const adminDashboardPath = ['', 'admin', 'dashboard'].join('/');
const senderDashboardPath = ['', 'sender', 'dashboard'].join('/');

export function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data } = useAuthMe();
  const user = data as AuthUser | undefined;
  const isAdmin = user?.role === 'admin' || user?.role === 'both';
  const isSender = user?.role === 'sender' || user?.role === 'both';
  const displayName = user?.full_name ?? user?.email ?? 'Chargement...';
  const demoMode = isDemoMode();
  const currentDemoRole = demoMode ? getDemoRole() : null;

  const handleSwitchToSender = () => {
    setDemoRole('sender');
    queryClient.invalidateQueries({ queryKey: ['authMe'] });
    router.replace(senderDashboardPath as Route);
    showToast?.('Switched to demo sender view', 'info');
  };

  const handleSwitchToAdmin = () => {
    setDemoRole('admin');
    queryClient.invalidateQueries({ queryKey: ['authMe'] });
    router.replace(adminDashboardPath as Route);
    showToast?.('Switched to demo admin view', 'info');
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <Link
        href={senderDashboardPath as Route}
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <span className="rounded-md bg-indigo-600 px-2 py-1 text-white">KCT</span>
        <span>Kobatela</span>
      </Link>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        {demoMode && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSwitchToSender}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                currentDemoRole === 'sender'
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              View as Sender
            </button>
            <button
              type="button"
              onClick={handleSwitchToAdmin}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                currentDemoRole === 'admin'
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              View as Admin
            </button>
          </div>
        )}
        {isAdmin && (
          <Link
            href={adminDashboardPath as Route}
            className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Admin
          </Link>
        )}
        {isSender && (
          <Link
            href="/sender/profile"
            className="rounded-md px-2 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Mon profil
          </Link>
        )}
        {user && <span className="font-medium text-slate-800">{displayName}</span>}
        {user && <LogoutButton />}
      </div>
    </header>
  );
}
