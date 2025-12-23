// Root layout for the Kobatela KCT MVP frontend, wiring up global providers and styles.
import type { Metadata } from 'next';
import './globals.css';
import { ReactQueryProvider } from './providers';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { ConnectionBanner } from '@/components/system/ConnectionBanner';

export const metadata: Metadata = {
  title: 'Kobatela KCT – MVP',
  description: 'Sender portal for the Kobatela KCT product.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <ReactQueryProvider>
          <ToastProvider>
            <DemoBanner />
            <ConnectionBanner />
            {children}
          </ToastProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
