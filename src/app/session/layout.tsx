import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Focus Session — Zoned',
};

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {children}
    </main>
  );
}
