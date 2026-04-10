"use client";

import React, { useState, useEffect } from 'react';

const BreathingBubble: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [phase, setPhase] = useState<'In' | 'Hold' | 'Out'>('In');
  const [timer, setTimer] = useState(4);

  useEffect(() => {
    const sequence = [
      { name: 'In', duration: 4 },
      { name: 'Hold', duration: 4 },
      { name: 'Out', duration: 6 },
    ] as const;

    let currentIdx = 0;
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          currentIdx = (currentIdx + 1) % sequence.length;
          setPhase(sequence[currentIdx].name);
          return sequence[currentIdx].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl p-8 min-h-[450px] transition-all duration-500 animate-in fade-in zoom-in">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <h2 className="text-xl font-bold dark:text-white">Breathing Bubble</h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Main Bubble Area */}
      <div className="relative flex items-center justify-center w-64 h-64">
        {/* Animated Background Glow */}
        <div 
          className={`absolute inset-0 rounded-full transition-all duration-[4000ms] ease-in-out blur-3xl opacity-30 ${
            phase === 'In' ? 'bg-emerald-400 scale-150' : 
            phase === 'Hold' ? 'bg-sky-400 scale-150' : 
            'bg-indigo-400 scale-100'
          }`}
        />

        {/* The Bubble */}
        <div 
          className={`relative w-40 h-40 rounded-full border-4 border-white/50 shadow-2xl transition-all duration-[4000ms] ease-in-out flex items-center justify-center ${
            phase === 'In' ? 'scale-[1.6] bg-emerald-500/80 shadow-emerald-500/40' : 
            phase === 'Hold' ? 'scale-[1.6] bg-sky-500/80 shadow-sky-500/40' : 
            'scale-100 bg-indigo-500/80 shadow-indigo-500/40'
          }`}
        >
          <div className="text-white text-center">
            <div className="text-2xl font-bold mb-1">{phase}</div>
            <div className="text-sm opacity-80">{timer}s</div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center max-w-xs">
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
          {phase === 'In' ? "Gently fill your lungs with fresh air..." : 
           phase === 'Hold' ? "Pause and feel the stillness..." : 
           "Slowly release all remaining tension..."}
        </p>
      </div>

      {/* Progress Indicators */}
      <div className="flex gap-2 mt-8">
        {['In', 'Hold', 'Out'].map((p) => (
          <div 
            key={p}
            className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
              phase === p ? 'bg-emerald-500 w-12' : 'bg-gray-200 dark:bg-gray-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default BreathingBubble;
