// Root layout for the Kobatela KCT MVP frontend, wiring up global providers and styles.
import type { Metadata } from 'next';
import './globals.css';
import { ReactQueryProvider } from './providers';

export const metadata: Metadata = {
  title: 'Kobatela KCT – MVP',
  description: 'Sender portal for the Kobatela KCT product.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
