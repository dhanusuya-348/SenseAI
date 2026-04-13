"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { ArenaLobby } from "@/components/Arena/ArenaLobby";
import { BattleRoom } from "@/components/Arena/BattleRoom";
import { Matchmaking } from "@/components/Arena/Matchmaking";
import { useBattleWebSocket, BattleMessage } from "@/hooks/useBattleWebSocket";
import { useThemePreference } from "@/lib/hooks/useThemePreference";

type ArenaView = "lobby" | "matchmaking" | "battle";

interface Module {
  id: string;
  title: string;
  difficulty?: string;
}

interface CurrentQuestionData {
  round: number;
  total: number;
  question: string;
  options: string[];
  time_limit: number;
}

interface RoundResultData {
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

export default function ArenaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  useThemePreference();

  const cohortId = parseInt(searchParams.get("cohort_id") || "0");
  const userId = parseInt(user?.id || "0");
  const userName = user?.name || user?.email?.split("@")[0] || "Player";

  const [view, setView] = useState<ArenaView>("lobby");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  // Battle state
  const [battleId, setBattleId] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [myRole, setMyRole] = useState<"player1" | "player2">("player1");
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestionData | undefined>();
  const [lastRoundResult, setLastRoundResult] = useState<RoundResultData | undefined>();
  const [battleEnd, setBattleEnd] = useState<BattleEndData | undefined>();
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

  // Fetch cohort modules
  useEffect(() => {
    if (!cohortId) return;
    const fetchModules = async () => {
      setLoadingModules(true);
      try {
        const res = await fetch(`${backendUrl}/cohorts/${cohortId}/courses?include_tree=true`);
        if (res.ok) {
          const data = await res.json();
          const allModules: Module[] = [];
          for (const course of data) {
            if (course.milestones) {
              for (const m of course.milestones) {
                if (!m.is_locked && !m.admin_locked && m.tasks?.length > 0) {
                  allModules.push({ id: m.id.toString(), title: m.name, difficulty: m.difficulty || "medium" });
                }
              }
            }
          }
          setModules(allModules);
        }
      } catch (e) {
        console.error("Failed to load modules for arena", e);
      } finally {
        setLoadingModules(false);
      }
    };
    fetchModules();
  }, [cohortId, backendUrl]);

  // WebSocket message handler
  const handleMessage = useCallback((msg: BattleMessage) => {
    switch (msg.type) {
      case "waiting":
        // Already in matchmaking view
        break;
      case "generating":
        setIsGenerating(true);
        break;
      case "match_found":
        setIsGenerating(false);
        setBattleId(msg.battle_id);
        setOpponentName(msg.opponent_name);
        setMyRole(msg.your_role);
        setTotalRounds(msg.total_rounds);
        // Slight delay for "match found" animation
        setTimeout(() => setView("battle"), 500);
        break;
      case "question":
        setCurrentQuestion({ round: msg.round, total: msg.total, question: msg.question, options: msg.options, time_limit: msg.time_limit });
        setLastRoundResult(undefined);
        break;
      case "round_result":
        setLastRoundResult(msg as RoundResultData);
        break;
      case "battle_end":
        setBattleEnd(msg as BattleEndData);
        // Dispatch credits update to header
        const newCredits = myRole === "player1" ? msg.p1_new_credits : msg.p2_new_credits;
        window.dispatchEvent(new CustomEvent("user-credits-updated", { detail: { credits: newCredits } }));
        break;
      case "opponent_disconnected":
        setOpponentDisconnected(true);
        break;
      case "cancelled":
        setView("lobby");
        break;
      case "error":
        console.error("Arena error:", msg.message);
        break;
    }
  }, [myRole]);

  const { connect, sendAnswer, cancel, disconnect } = useBattleWebSocket({
    userId,
    userName,
    cohortId,
    moduleId: parseInt(selectedModule?.id || "0"),
    moduleName: selectedModule?.title || "",
    difficulty: selectedModule?.difficulty || "medium",
    onMessage: handleMessage,
  });

  const handleStartBattle = useCallback((moduleId: string, moduleName: string, difficulty: string) => {
    if (!userId || !cohortId) return;
    setSelectedModule({ id: moduleId, title: moduleName, difficulty });
    setBattleEnd(undefined);
    setOpponentDisconnected(false);
    setCurrentQuestion(undefined);
    setLastRoundResult(undefined);
    setIsGenerating(false);
    setView("matchmaking");
    // Connect after short delay to let state settle
    setTimeout(() => connect(), 100);
  }, [userId, cohortId, connect]);

  const handleCancel = useCallback(() => {
    cancel();
    disconnect();
    setView("lobby");
  }, [cancel, disconnect]);

  const handleReturnToLobby = useCallback(() => {
    disconnect();
    setView("lobby");
    setBattleEnd(undefined);
    setOpponentDisconnected(false);
    setCurrentQuestion(undefined);
    setLastRoundResult(undefined);
  }, [disconnect]);

  const handleSpectate = useCallback((watchBattleId: string) => {
    router.push(`/arena/spectate/${watchBattleId}?cohort_id=${cohortId}`);
  }, [router, cohortId]);

  if (!cohortId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No cohort selected. Please go back to your school.</p>
          <button onClick={() => router.back()} className="px-6 py-3 rounded-xl bg-purple-600 text-white">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="hidden sm:block">
        <Header showCreateCourseButton={false} />
      </div>

      {view === "lobby" && (
        <ArenaLobby
          cohortId={cohortId}
          userId={userId}
          modules={loadingModules ? [] : modules}
          onStartBattle={handleStartBattle}
          onSpectate={handleSpectate}
        />
      )}

      {view === "matchmaking" && (
        <Matchmaking
          moduleName={selectedModule?.title || ""}
          onCancel={handleCancel}
          isGenerating={isGenerating}
        />
      )}

      {view === "battle" && (
        <BattleRoom
          battleId={battleId}
          opponentName={opponentName}
          playerName={userName}
          myRole={myRole}
          myUserId={userId}
          moduleName={selectedModule?.title || ""}
          totalRounds={totalRounds}
          onAnswer={sendAnswer}
          currentQuestion={currentQuestion}
          lastRoundResult={lastRoundResult}
          battleEnd={battleEnd}
          opponentDisconnected={opponentDisconnected}
          onReturnToLobby={handleReturnToLobby}
        />
      )}
    </div>
  );
}
