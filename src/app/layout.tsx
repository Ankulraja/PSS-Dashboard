import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PageSpeed Performance Monitoring Dashboard',
  description: 'Production-grade PageSpeed Performance Monitoring Dashboard fetching real Google Sheets data over time.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
