import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { InstallHint } from '@/components/InstallHint';

export const metadata: Metadata = {
  title: 'CBT Minyan App',
  description: 'Companion for the daily minyan at Congregation Beth Tefillah',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'CBT Minyan' }
};

export const viewport: Viewport = {
  themeColor: '#0f1e2e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        {children}
        <InstallHint />
      </body>
    </html>
  );
}
