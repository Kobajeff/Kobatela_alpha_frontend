'use client';

// Layout guarding provider routes and wrapping them in a basic container.
import { PortalModeSetter } from '@/components/system/PortalModeSetter';

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortalModeSetter mode="provider" />
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl space-y-6">{children}</div>
      </div>
    </>
  );
}
