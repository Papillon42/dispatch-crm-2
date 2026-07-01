import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { GlobeBackground } from '@/components/layout/GlobeBackground';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { themeInitScript } from '@/lib/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dispatch CRM',
  description: 'Trucking Dispatch Operating System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        {/* Rendered as a sibling of <body>, Next.js hoists this into <head> and
            runs it before hydration so the correct theme is applied with no flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
        <body className={`${inter.className} bg-background text-text-primary antialiased`} suppressHydrationWarning>
          <ThemeProvider>
            <GlobeBackground />
            <div className="relative z-10">{children}</div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
