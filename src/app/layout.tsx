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
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-height-screen">
        {children}
      </body>
    </html>
  );
}
