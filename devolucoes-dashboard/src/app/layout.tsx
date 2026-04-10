import type { Metadata } from 'next';
import { Inter, Source_Code_Pro, Syne } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import './globals.css';

const geistSans = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Source_Code_Pro({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const syne = Syne({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['700', '800'],
});

export const metadata: Metadata = {
  title: 'DevML — Gestão de Devoluções',
  description: 'Dashboard de monitoramento e gestão de devoluções em tempo real',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: {
                background: '#1a1f2e',
                border: '1px solid #2a3040',
                color: '#e2e8f0',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
