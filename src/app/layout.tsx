// Root layout for the Kobatela KCT MVP frontend, wiring up global providers and styles.
import type { Metadata } from 'next';
import './globals.css';
import { ReactQueryProvider } from './providers';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { ConnectionBanner } from '@/components/system/ConnectionBanner';
import { DEV_DISABLE_PROVIDERS } from '@/lib/devFlags';
import { DevProviderStatus } from './DevProviderStatus';

export const metadata: Metadata = {
  title: 'Kobatela KCT – MVP',
  description: 'Sender portal for the Kobatela KCT product.'
};

function UiShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DemoBanner />
      <ConnectionBanner />
      {children}
    </ToastProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = DEV_DISABLE_PROVIDERS ? children : <UiShell>{children}</UiShell>;

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <DevProviderStatus />
        <ReactQueryProvider>{content}</ReactQueryProvider>
      </body>
    </html>
  );
}
