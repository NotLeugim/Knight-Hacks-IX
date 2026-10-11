import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AppShell } from '@/components/ui/AppShell';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SPOTSight — Orbit Robot Fleet Management',
  description:
    'Real-time SPOT robot mission dashboard and design system for plant operators. Native Orbit add-on styling.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="h-full bg-orbit-bg text-text-primary font-sans antialiased overflow-hidden">
        <AppShell>{children}</AppShell>
        <Script data-api-key="92b1f012-9d4a-4dee-b9a5-ebcac390ec63" src="https://raiabot.raia2.com/assets/raia-chatbot-widget.js" strategy="afterInteractive"/>
      </body>
    </html>
  );
}
