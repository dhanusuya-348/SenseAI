"use client";

import React, { useState } from 'react';
import FroggyGame from './FroggyGame';
import BreathingBubble from './BreathingBubble';

interface GameSwitcherProps {
  onClose: () => void;
}

const GameSwitcher: React.FC<GameSwitcherProps> = ({ onClose }) => {
  const [activeView, setActiveView] = useState<'menu' | 'froggy' | 'breathing'>('menu');

  if (activeView === 'froggy') {
    return <FroggyGame onGameOver={() => {}} onClose={() => setActiveView('menu')} />;
  }

  if (activeView === 'breathing') {
    return <BreathingBubble onClose={() => setActiveView('menu')} />;
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl max-w-[450px] w-full animate-in fade-in zoom-in duration-300 border border-gray-100 dark:border-gray-800">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Calm Zone</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Pick a way to unwind 🌿</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="grid gap-4">
        {/* Froggy Rain Catcher Option */}
        <button
          onClick={() => setActiveView('froggy')}
          className="group relative flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-2xl transition-all duration-300 text-left border border-emerald-100/50 dark:border-emerald-800/30 overflow-hidden"
        >
          <div className="text-4xl bg-white dark:bg-gray-800 w-16 h-16 flex items-center justify-center rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            🐸
          </div>
          <div>
            <h3 className="font-bold text-emerald-900 dark:text-emerald-400">Froggy Rain Catcher</h3>
            <p className="text-sm text-emerald-700/70 dark:text-emerald-500/60">Catch raindrops on a peaceful pond</p>
          </div>
          <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>

        {/* Breathing Bubble Option */}
        <button
          onClick={() => setActiveView('breathing')}
          className="group relative flex items-center gap-4 p-4 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-2xl transition-all duration-300 text-left border border-sky-100/50 dark:border-sky-800/30 overflow-hidden"
        >
          <div className="text-4xl bg-white dark:bg-gray-800 w-16 h-16 flex items-center justify-center rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            🧘
          </div>
          <div>
            <h3 className="font-bold text-sky-900 dark:text-sky-400">Breathing Bubble</h3>
            <p className="text-sm text-sky-700/70 dark:text-sky-500/60">Find your rhythm with guided breathing</p>
          </div>
          <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>
      </div>

      <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
        "Take a deep breath. You're doing great."
      </p>
    </div>
  );
};

export default GameSwitcher;
