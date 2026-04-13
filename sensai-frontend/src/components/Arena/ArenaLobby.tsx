"use client";
import { useEffect, useState } from "react";
import { Trophy, Sword, Eye, RotateCcw, Coins, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardEntry {
  user_id: number;
  name: string;
  wins: number;
  losses: number;
  total_score: number;
  win_streak: number;
}

interface RecentBattle {
  id: number;
  player1_name: string;
  player2_name: string;
  module_name: string;
  winner_id: number | null;
  player1_score: number;
  player2_score: number;
  player1_id: number;
}

interface ActiveBattle {
  battle_id: string;
  module_name: string;
  player1_name: string;
  player2_name: string;
  round: number;
  total_rounds: number;
  p1_score: number;
  p2_score: number;
  spectator_count: number;
}

interface Module {
  id: string;
  title: string;
  difficulty?: string;
}

interface ArenaLobbyProps {
  cohortId: number;
  userId: number;
  modules: Module[];
  onStartBattle: (moduleId: string, moduleName: string, difficulty: string) => void;
  onSpectate: (battleId: string) => void;
}

export function ArenaLobby({ cohortId, userId, modules, onStartBattle, onSpectate }: ArenaLobbyProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentBattles, setRecentBattles] = useState<RecentBattle[]>([]);
  const [activeBattles, setActiveBattles] = useState<ActiveBattle[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>(modules[0]?.id || "");
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [lb, recent, active] = await Promise.all([
          fetch(`${backendUrl}/arena/leaderboard/${cohortId}`).then(r => r.json()).catch(() => []),
          fetch(`${backendUrl}/arena/battles/${cohortId}/recent`).then(r => r.json()).catch(() => []),
          fetch(`${backendUrl}/arena/battles/active`).then(r => r.json()).catch(() => []),
        ]);
        setLeaderboard(Array.isArray(lb) ? lb : []);
        setRecentBattles(Array.isArray(recent) ? recent : []);
        setActiveBattles(Array.isArray(active) ? active : []);
      } catch (e) {
        console.error("Failed to fetch arena data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [cohortId, backendUrl]);

  const selectedModuleObj = modules.find(m => m.id === selectedModule);

  const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
  const rankBg = ["bg-yellow-400/10 border-yellow-400/30", "bg-gray-400/10 border-gray-400/30", "bg-amber-700/10 border-amber-700/30"];

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-indigo-950 to-black border-b border-purple-800/30 px-6 py-12 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_60%)]" />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <Sword size={32} className="text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Learning Arena
            </h1>
            <Sword size={32} className="text-cyan-400 scale-x-[-1]" />
          </div>
          <p className="text-gray-400 text-sm">Challenge your cohort mates. Battle for glory. Earn credits.</p>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Start Battle + Active Battles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Start Battle Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-900/30 to-indigo-900/20 border border-purple-700/40 rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
              <Sword size={18} /> Start a Battle
            </h2>

            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Choose Module</label>
              <select
                className="w-full bg-black/40 border border-purple-700/50 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
                value={selectedModule}
                onChange={e => setSelectedModule(e.target.value)}
              >
                {modules.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 mb-5">
              <div>
                <div className="text-xs text-gray-500 mb-1">Format</div>
                <div className="text-sm text-white">5 Rounds · 30s each · AI-generated questions</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Win reward</div>
                <div className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Coins size={14} /> 50 credits
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (selectedModuleObj) {
                  onStartBattle(selectedModuleObj.id, selectedModuleObj.title, selectedModuleObj.difficulty || "medium");
                }
              }}
              disabled={!selectedModule}
              className="w-full py-4 rounded-xl font-bold text-black bg-gradient-to-r from-purple-400 to-cyan-400 hover:from-purple-300 hover:to-cyan-300 transition-all shadow-lg shadow-purple-500/20 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              ⚔️ Enter the Arena
            </button>
          </motion.div>

          {/* Live Battles */}
          {activeBattles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
              className="bg-black/40 border border-white/10 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Eye size={18} className="text-cyan-400" /> Live Battles
              </h2>
              <div className="space-y-3">
                {activeBattles.map(battle => (
                  <div key={battle.battle_id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{battle.module_name} · Round {battle.round}/{battle.total_rounds}</div>
                      <div className="text-sm text-white font-medium">
                        {battle.player1_name} <span className="text-purple-400">vs</span> {battle.player2_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {battle.p1_score} — {battle.p2_score} · 👁 {battle.spectator_count}
                      </div>
                    </div>
                    <button
                      onClick={() => onSpectate(battle.battle_id)}
                      className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/20 transition-all"
                    >
                      Watch
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent Battles */}
          {recentBattles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
              className="bg-black/40 border border-white/10 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <RotateCcw size={16} className="text-gray-400" /> Recent Battles
              </h2>
              <div className="space-y-2">
                {recentBattles.slice(0, 5).map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/8 text-sm">
                    <div className="text-gray-400 text-xs truncate max-w-[120px]">{b.module_name}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={b.winner_id === b.player1_id ? "text-green-400 font-semibold" : "text-gray-400"}>{b.player1_name}</span>
                      <span className="text-gray-600">{b.player1_score}–{b.player2_score}</span>
                      <span className={b.winner_id !== b.player1_id && b.winner_id !== null ? "text-green-400 font-semibold" : "text-gray-400"}>{b.player2_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
            className="bg-black/40 border border-white/10 rounded-2xl p-6 sticky top-4"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-yellow-400" /> This Week
            </h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">No battles yet this week.<br />Be the first!</div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${i < 3 ? rankBg[i] : "bg-white/3 border-white/10"}`}
                  >
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm ${i < 3 ? rankColors[i] : "text-gray-500"}`}>
                      {i === 0 ? <Crown size={16} /> : `${i + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate font-medium">{entry.name}</div>
                      <div className="text-xs text-gray-500">{entry.wins}W · {entry.losses}L</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-purple-400">{entry.total_score}</div>
                      <div className="text-xs text-gray-600">pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
