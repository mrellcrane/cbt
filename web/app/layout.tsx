import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ember — CBT Companion',
  description:
    'A supportive tool for Cognitive Behavioral Therapy exercises, powered by AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
