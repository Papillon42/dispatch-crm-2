import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { GlobeBackground } from '@/components/layout/GlobeBackground';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dispatch CRM',
  description: 'Trucking Dispatch Operating System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-background text-text-primary antialiased`}>
          <GlobeBackground />
          <div className="relative z-10">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  );
}
