import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agentic AI Tutor | Quality Education for All',
  description: 'An intelligent AI tutor aligned with SDG 4 - Ensuring inclusive and equitable quality education for all learners.',
  keywords: ['AI Tutor', 'Education', 'SDG 4', 'Learning', 'Agentic AI'],
  authors: [{ name: 'CSRBOX Capstone Project' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
