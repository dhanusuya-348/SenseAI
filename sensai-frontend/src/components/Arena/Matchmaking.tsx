"use client";
import { motion } from "framer-motion";
import { Sword, X } from "lucide-react";

interface MatchmakingProps {
  moduleName: string;
  onCancel: () => void;
  isGenerating?: boolean;
}

export function Matchmaking({ moduleName, onCancel, isGenerating }: MatchmakingProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center px-8 max-w-md"
      >
        {/* Animated swords */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <motion.div
            animate={{ x: [0, 8, 0], rotate: [-15, 0, -15] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sword size={48} className="text-purple-400" />
          </motion.div>

          {/* Pulsing orb */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-6 h-6 rounded-full bg-purple-400"
            />
            <motion.div
              animate={{ scale: [1, 2, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-purple-400"
            />
          </div>

          <motion.div
            animate={{ x: [0, -8, 0], rotate: [15, 0, 15] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sword size={48} className="text-cyan-400 scale-x-[-1]" />
          </motion.div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isGenerating ? "Preparing Battle..." : "Searching for Opponent..."}
        </h2>

        <p className="text-gray-400 mb-2">
          Topic: <span className="text-purple-300 font-medium">{moduleName}</span>
        </p>

        {isGenerating ? (
          <div className="mt-6 p-4 rounded-xl bg-purple-900/20 border border-purple-700/30">
            <p className="text-sm text-purple-300 mb-1">🤖 AI is generating fresh questions...</p>
            <p className="text-xs text-gray-500">Questions are created uniquely for each battle</p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, delay: i * 0.3, repeat: Infinity }}
                className="h-1 bg-purple-600 rounded-full"
              />
            ))}
          </div>
        )}

        <button
          onClick={onCancel}
          className="mt-10 flex items-center gap-2 mx-auto px-6 py-3 rounded-full border border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-all text-sm"
        >
          <X size={16} /> Cancel
        </button>
      </motion.div>
    </div>
  );
}
