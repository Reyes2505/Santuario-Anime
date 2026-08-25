import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Header from '@/components/Header';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Santuario Anime | Mushoku Tensei Offline Stream',
  description:
    'Plataforma privada de streaming de anime optimizada para reproducción de episodios locales en alta calidad.',
  keywords: ['Mushoku Tensei', 'Anime Stream', 'Santuario Anime', 'Offline Video Player'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-blue-600 selection:text-white">
        <Header />
        <div className="flex-grow flex flex-col">{children}</div>
      </body>
    </html>
  );
}
