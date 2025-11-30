'use client';

// Header component displaying the Kobatela brand and current user info.
import Link from 'next/link';
import { useAuthMe } from '@/lib/queries/sender';

export function Header() {
  const { data: user } = useAuthMe();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
      <Link href="/sender/dashboard" className="flex items-center gap-2 font-semibold text-lg">
        <span className="rounded-md bg-indigo-600 px-2 py-1 text-white">KCT</span>
        <span>Kobatela</span>
      </Link>
      <div className="text-sm text-slate-600">
        {user ? `Bonjour, ${user.full_name ?? user.email}` : 'Chargement...'}
      </div>
    </header>
  );
}
