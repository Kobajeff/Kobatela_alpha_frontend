// Root layout for the Kobatela KCT MVP frontend, wiring up global providers and styles.
import type { Metadata } from 'next';
import './globals.css';
import { ReactQueryProvider } from './providers';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { ConnectionBanner } from '@/components/system/ConnectionBanner';
import {
  DEV_DISABLE_CONNECTION_BANNER,
  DEV_DISABLE_DEMO_BANNER,
  DEV_DISABLE_GLOBAL_BANNERS
} from '@/lib/devFlags';
import { DevProviderStatus } from './DevProviderStatus';

export const metadata: Metadata = {
  title: 'Kobatela KCT – MVP',
  description: 'Sender portal for the Kobatela KCT product.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const showDemoBanner =
    !DEV_DISABLE_GLOBAL_BANNERS && !DEV_DISABLE_DEMO_BANNER;
  const showConnectionBanner =
    !DEV_DISABLE_GLOBAL_BANNERS && !DEV_DISABLE_CONNECTION_BANNER;

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <DevProviderStatus />
        <ReactQueryProvider>
          <ToastProvider>
            {showDemoBanner ? <DemoBanner /> : null}
            {showConnectionBanner ? <ConnectionBanner /> : null}
            {children}
          </ToastProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
