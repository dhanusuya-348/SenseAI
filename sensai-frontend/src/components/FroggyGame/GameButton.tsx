"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Gamepad2 } from 'lucide-react';
import GameSwitcher from '../RelaxationGames/GameSwitcher';

const GameButton: React.FC = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Show only on the courses list page
  const isCoursesPage = pathname.match(/^\/school\/[^/]+\/courses\/?$/);
  
  if (!isCoursesPage) return null;

  return (
    // Shifted slightly to the left (right-24) to avoid overlap with native mobile FAB
    <div className="fixed bottom-6 right-8 sm:right-12 z-[9999]">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/20 transform hover:scale-105 transition-all duration-300 group border border-emerald-400/20 active:scale-95"
        >
          <Gamepad2 size={20} className="group-hover:rotate-12 transition-transform duration-300" />
          <span className="font-medium text-sm tracking-tight whitespace-nowrap">Take a Break</span>
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
