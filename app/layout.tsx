import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SolTax AU - Australian Solana Tax Engine',
  description: 'AI-powered Solana tax engine for Australian investors. Generate ATO-compliant tax reports with ease.',
  keywords: ['Solana', 'tax', 'Australia', 'ATO', 'crypto', 'cryptocurrency', 'CGT', 'blockchain'],
  authors: [{ name: 'SolTax AU' }],
  creator: 'SolTax AU',
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    siteName: 'SolTax AU',
    title: 'SolTax AU - Australian Solana Tax Engine',
    description: 'AI-powered Solana tax engine for Australian investors. Generate ATO-compliant tax reports with ease.',
    countryName: 'Australia',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SolTax AU - Australian Solana Tax Engine',
    description: 'AI-powered Solana tax engine for Australian investors.',
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
        {children}
      </body>
    </html>
  );
}
