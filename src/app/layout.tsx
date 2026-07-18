import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { GlobeBackground } from '@/components/layout/GlobeBackground';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { themeInitScript } from '@/lib/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dispatch CRM',
  description: 'Trucking Dispatch Operating System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body className={`${inter.className} bg-background text-text-primary antialiased`} suppressHydrationWarning>
        <ClerkProvider>
          <ThemeProvider>
            <ToastProvider>
              <GlobeBackground />
              <div className="relative z-10">{children}</div>
            </ToastProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
