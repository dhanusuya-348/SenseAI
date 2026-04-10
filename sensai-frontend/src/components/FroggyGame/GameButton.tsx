"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import GameSwitcher from '../RelaxationGames/GameSwitcher';

const GameButton: React.FC = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Filter paths: Show only on school pages, but not on admin/login pages
  const isExcluded = pathname === '/' || pathname === '/login' || pathname.startsWith('/school/admin');
  if (isExcluded) return null;

  return (
    // Shifted slightly to the left (right-24) to avoid overlap with native mobile FAB
    <div className="fixed bottom-6 right-8 sm:right-12 z-[9999]">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/30 transform hover:scale-105 transition-all duration-300 group overflow-hidden border border-emerald-400/20"
        >
          <span className="text-xl group-hover:animate-bounce">✨</span>
          <span className="font-semibold whitespace-nowrap">Take a Break</span>
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </button>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 z-[10000]">
          <div className="w-full max-w-[450px]">
            <GameSwitcher onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default GameButton;
