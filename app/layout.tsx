import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TaxMate — Solana crypto tax for Australian investors',
  description:
    'TaxMate generates ATO-compliant tax reports from any Solana wallet. AI-powered classification for swaps, staking, airdrops and more.',
  keywords: ['TaxMate', 'Solana', 'tax', 'Australia', 'ATO', 'crypto', 'cryptocurrency', 'CGT', 'blockchain'],
  authors: [{ name: 'TaxMate' }],
  creator: 'TaxMate',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: ['/favicon.svg'],
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    siteName: 'TaxMate',
    title: 'TaxMate — Solana crypto tax for Australian investors',
    description:
      'TaxMate generates ATO-compliant tax reports from any Solana wallet.',
    countryName: 'Australia',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaxMate — Solana crypto tax for Australian investors',
    description: 'ATO-compliant tax reports from any Solana wallet.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
