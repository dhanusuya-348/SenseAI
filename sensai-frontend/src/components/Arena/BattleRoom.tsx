"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Shield, Swords, Trophy, Clock, CheckCircle2, XCircle } from "lucide-react";
import confetti from "canvas-confetti";

interface RoundResult {
  round: number;
  correct_index: number;
  p1_correct: boolean;
  p2_correct: boolean;
  p1_points_earned: number;
  p2_points_earned: number;
  p1_total: number;
  p2_total: number;
  p1_answer: number | null;
  p2_answer: number | null;
}

interface BattleEndData {
  winner_id: number | null;
  p1_final_score: number;
  p2_final_score: number;
  p1_credits_earned: number;
  p2_credits_earned: number;
  p1_new_credits: number;
  p2_new_credits: number;
}

interface BattleRoomProps {
  battleId: string;
  opponentName: string;
  playerName: string;
  myRole: "player1" | "player2";
  myUserId: number;
  moduleName: string;
  totalRounds: number;
  onAnswer: (index: number) => void;
  // Messages
  currentQuestion?: { round: number; total: number; question: string; options: string[]; time_limit: number };
  lastRoundResult?: RoundResult;
  battleEnd?: BattleEndData;
  opponentDisconnected?: boolean;
  onReturnToLobby: () => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];
const ANSWER_COLORS = {
  default: "bg-white/5 border-white/10 hover:bg-purple-500/10 hover:border-purple-500/30 text-white cursor-pointer",
  selected: "bg-purple-500/20 border-purple-500 text-white",
  correct: "bg-emerald-500/20 border-emerald-500 text-emerald-300",
  wrong: "bg-red-500/20 border-red-500 text-red-300",
};

export function BattleRoom({
  battleId,
  opponentName,
  playerName,
  myRole,
  myUserId,
  moduleName,
  totalRounds,
  onAnswer,
  currentQuestion,
  lastRoundResult,
  battleEnd,
  opponentDisconnected,
  onReturnToLobby,
}: BattleRoomProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showResult, setShowResult] = useState(false);

  // My score vs opponent score
  const myScore = myRole === "player1" ? (lastRoundResult?.p1_total ?? 0) : (lastRoundResult?.p2_total ?? 0);
  const oppScore = myRole === "player1" ? (lastRoundResult?.p2_total ?? 0) : (lastRoundResult?.p1_total ?? 0);
  const myCorrect = myRole === "player1" ? lastRoundResult?.p1_correct : lastRoundResult?.p2_correct;

  // Reset state on new question
  useEffect(() => {
    if (currentQuestion) {
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
      setTimeLeft(currentQuestion.time_limit);
      setShowResult(false);
    }
  }, [currentQuestion?.round]);

  // Countdown timer
  useEffect(() => {
    if (!currentQuestion || answerSubmitted || showResult) return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, currentQuestion, answerSubmitted, showResult]);

  // Show result when round_result arrives
  useEffect(() => {
    if (lastRoundResult) {
      setShowResult(true);
    }
  }, [lastRoundResult?.round]);

  // Battle end confetti
  useEffect(() => {
    if (battleEnd) {
      const iWon =
        (myRole === "player1" && battleEnd.winner_id !== null && battleEnd.p1_final_score > battleEnd.p2_final_score) ||
        (myRole === "player2" && battleEnd.winner_id !== null && battleEnd.p2_final_score > battleEnd.p1_final_score);
      if (iWon) {
        confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 }, colors: ["#a855f7", "#06b6d4", "#fbbf24"] });
      }
    }
  }, [battleEnd]);

  const handleAnswer = useCallback((index: number) => {
    if (answerSubmitted || showResult) return;
    setSelectedAnswer(index);
    setAnswerSubmitted(true);
    onAnswer(index);
  }, [answerSubmitted, showResult, onAnswer]);

  const getOptionStyle = (index: number) => {
    if (!showResult) {
      if (selectedAnswer === index) return ANSWER_COLORS.selected;
      return ANSWER_COLORS.default;
    }
    // After reveal
    if (lastRoundResult && index === lastRoundResult.correct_index) return ANSWER_COLORS.correct;
    if (selectedAnswer === index && index !== lastRoundResult?.correct_index) return ANSWER_COLORS.wrong;
    return "bg-white/3 border-white/8 text-gray-500 cursor-default";
  };

  const myFinalScore = myRole === "player1" ? battleEnd?.p1_final_score : battleEnd?.p2_final_score;
  const oppFinalScore = myRole === "player1" ? battleEnd?.p2_final_score : battleEnd?.p1_final_score;
  const iWon = battleEnd &&
    ((myRole === "player1" && (myFinalScore ?? 0) > (oppFinalScore ?? 0)) ||
     (myRole === "player2" && (myFinalScore ?? 0) > (oppFinalScore ?? 0)));
  const isDraw = battleEnd && myFinalScore === oppFinalScore;

  const creditsEarned = myRole === "player1" ? battleEnd?.p1_credits_earned : battleEnd?.p2_credits_earned;

  // ── Scoreboard header ──────────────────────────────────────────────────────
  const renderScoreBar = () => {
    const currentMyScore = myRole === "player1" ? (lastRoundResult?.p1_total ?? 0) : (lastRoundResult?.p2_total ?? 0);
    const currentOppScore = myRole === "player1" ? (lastRoundResult?.p2_total ?? 0) : (lastRoundResult?.p1_total ?? 0);
    return (
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/60 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-0.5">You</div>
          <div className="text-2xl font-bold text-white">{currentMyScore}</div>
          <div className="text-xs text-gray-500 truncate max-w-[80px]">{playerName}</div>
        </div>
        <div className="text-center px-4">
          <div className="text-xs text-gray-500 mb-1">{currentQuestion ? `Round ${currentQuestion.round}/${currentQuestion.total}` : "—"}</div>
          <Swords size={24} className="text-purple-400 mx-auto" />
          <div className="text-xs text-gray-500 mt-1">{moduleName}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-0.5">Opponent</div>
          <div className="text-2xl font-bold text-white">{currentOppScore}</div>
          <div className="text-xs text-gray-500 truncate max-w-[80px]">{opponentName}</div>
        </div>
      </div>
    );
  };

  // ── Battle End Screen ──────────────────────────────────────────────────────
  if (battleEnd || opponentDisconnected) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm"
            >
              {opponentDisconnected ? (
                <>
                  <div className="text-5xl mb-4">🏆</div>
                  <h2 className="text-3xl font-bold text-white mb-2">You Win!</h2>
                  <p className="text-gray-400 mb-6">Opponent disconnected</p>
                </>
              ) : iWon ? (
                <>
                  <div className="text-5xl mb-4">🏆</div>
                  <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text mb-2">Victory!</h2>
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white mb-1">{myFinalScore} <span className="text-gray-600">—</span> {oppFinalScore}</div>
                </>
              ) : isDraw ? (
                <>
                  <div className="text-5xl mb-4">🤝</div>
                  <h2 className="text-3xl font-bold text-white mb-2">Draw!</h2>
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white mb-1">{myFinalScore} <span className="text-gray-600">—</span> {oppFinalScore}</div>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">💪</div>
                  <h2 className="text-3xl font-bold text-white mb-2">Good Fight!</h2>
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white mb-1">{myFinalScore} <span className="text-gray-600">—</span> {oppFinalScore}</div>
                </>
              )}
              {battleEnd && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-center gap-2 text-amber-400">
                    <Coins size={20} />
                    <span className="text-xl font-bold">+{creditsEarned} credits earned!</span>
                  </div>
                </div>
              )}
              <button
                onClick={onReturnToLobby}
                className="mt-8 w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-black font-bold text-lg hover:opacity-90 transition-all"
              >
                Return to Lobby
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Active Battle ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[#060606] flex flex-col">
      {renderScoreBar()}

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-6">
        {currentQuestion ? (
          <motion.div
            key={currentQuestion.round}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg"
          >
            {/* Timer */}
            <div className="flex items-center justify-center mb-6">
              <div className={`flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-bold transition-colors ${
                timeLeft <= 10 ? "text-red-400 border-red-400/40 bg-red-400/10" : "text-purple-300 border-purple-400/30 bg-purple-400/5"
              }`}>
                <Clock size={14} /> {timeLeft}s
              </div>
            </div>

            {/* Question */}
            <div className="mb-6 text-center">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Round {currentQuestion.round} of {currentQuestion.total}</div>
              <p className="text-lg text-white font-medium leading-relaxed">{currentQuestion.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: answerSubmitted || showResult ? 1 : 0.97 }}
                  onClick={() => handleAnswer(i)}
                  disabled={answerSubmitted || showResult}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${getOptionStyle(i)}`}
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-sm font-bold flex-shrink-0">
                    {showResult && lastRoundResult && i === lastRoundResult.correct_index ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : showResult && selectedAnswer === i && i !== lastRoundResult?.correct_index ? (
                      <XCircle size={18} className="text-red-400" />
                    ) : OPTION_LABELS[i]}
                  </div>
                  <span>{option}</span>
                </motion.button>
              ))}
            </div>

            {/* Round result feedback */}
            {showResult && lastRoundResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-5 p-4 rounded-xl border text-center ${
                  myCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                <div className="font-bold text-lg">
                  {myCorrect ? "✅ Correct!" : "❌ Wrong!"}
                </div>
                {(() => {
                  const myPts = myRole === "player1" ? lastRoundResult.p1_points_earned : lastRoundResult.p2_points_earned;
                  return myPts > 0 ? <div className="text-sm opacity-80">+{myPts} points</div> : null;
                })()}
                <div className="text-xs opacity-60 mt-1">Next round in a moment...</div>
              </motion.div>
            )}

            {answerSubmitted && !showResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5 text-center text-gray-500 text-sm"
              >
                Answer submitted · waiting for opponent...
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading question...
          </div>
        )}
      </div>
    </div>
  );
}
