'use client';

// Header component displaying the Kobatela brand and current user info.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { clearAuthToken } from '@/lib/auth';
import { useAuthMe } from '@/lib/queries/sender';
import { getDemoRole, isDemoMode, setDemoRole } from '@/lib/config';
import { useToast } from '@/components/ui/ToastProvider';

export function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: user } = useAuthMe();
  const isAdmin = user?.role === 'admin';
  const displayName = user?.full_name ?? user?.email ?? 'Chargement...';
  const demoMode = isDemoMode();
  const currentDemoRole = demoMode ? getDemoRole() : null;

  const handleLogout = () => {
    clearAuthToken();
    queryClient.clear();
    router.push('/login');
  };

  const handleSwitchToSender = () => {
    setDemoRole('sender');
    queryClient.invalidateQueries({ queryKey: ['authMe'] });
    router.replace('/sender/dashboard');
    showToast?.('Switched to demo sender view', 'info');
  };

  const handleSwitchToAdmin = () => {
    setDemoRole('admin');
    queryClient.invalidateQueries({ queryKey: ['authMe'] });
    router.replace('/admin/dashboard');
    showToast?.('Switched to demo admin view', 'info');
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <Link href="/sender/dashboard" className="flex items-center gap-2 text-lg font-semibold">
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
            href="/admin/dashboard"
            className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Admin
          </Link>
        )}
        <span className="font-medium text-slate-800">{displayName}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
