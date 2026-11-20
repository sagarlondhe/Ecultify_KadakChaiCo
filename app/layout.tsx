import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kadak Chai Co. — #MyChaiBreak',
  description:
    'Every chai break has a story. Share a little moment from your chai break with Kadak Chai Co.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream-100 text-chai-950 antialiased">{children}</body>
    </html>
  );
}
