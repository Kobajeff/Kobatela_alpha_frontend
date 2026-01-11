'use client';

// Layout for provider routes with portal chrome and mode tracking.
import { AppShell } from '@/components/layout/AppShell';
import { PortalModeSetter } from '@/components/system/PortalModeSetter';

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortalModeSetter mode="provider" />
      <AppShell>{children}</AppShell>
    </>
  );
}
