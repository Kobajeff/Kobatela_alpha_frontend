'use client';

// Shell for advisor routes including header, sidebar, and main content.
import { Header } from './Header';
import { AdvisorSidebar } from './AdvisorSidebar';

export function AdvisorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <div className="flex">
        <AdvisorSidebar />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-5xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
