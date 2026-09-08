import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Norya AI',
  description: 'The AI receptionist that answers, qualifies, and books.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
