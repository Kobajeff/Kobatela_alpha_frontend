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

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <ToastProvider>
        <DemoBanner />
        <ConnectionBanner />
        {children}
      </ToastProvider>
    </ReactQueryProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <DevProviderStatus />
        {DEV_DISABLE_PROVIDERS ? children : <Providers>{children}</Providers>}
      </body>
    </html>
  );
}
