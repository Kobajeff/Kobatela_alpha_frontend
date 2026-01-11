'use client';

// Layout guarding sender routes and wrapping them in the application shell.
import { AppShell } from '@/components/layout/AppShell';
import { PortalModeSetter } from '@/components/system/PortalModeSetter';

export default function SenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortalModeSetter mode="sender" />
      <AppShell>{children}</AppShell>
    </>
  );
}
