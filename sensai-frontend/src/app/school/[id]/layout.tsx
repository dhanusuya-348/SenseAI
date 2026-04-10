import React from 'react';
import GameButton from '@/components/FroggyGame/GameButton';
import NotificationManager from '@/components/FroggyGame/NotificationManager';

export default function LearnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen">
      {children}
      <GameButton />
      <NotificationManager />
    </div>
  );
}
