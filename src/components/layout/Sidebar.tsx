'use client';

// Sidebar navigation for sender-specific sections.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';

const links = [
  { href: '/sender/dashboard', label: 'Dashboard' },
  { href: '/sender/escrows', label: 'Escrows' }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r border-slate-200 bg-white px-4 py-6">
      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href as Route}
              className={`rounded-md px-3 py-2 text-sm font-medium hover:bg-indigo-50 ${
                active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
