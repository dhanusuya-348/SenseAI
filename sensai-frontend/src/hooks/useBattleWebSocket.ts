"use client";
import { useEffect, useRef, useCallback, useState } from "react";

export type BattleMessage =
  | { type: "waiting"; message: string }
  | { type: "generating"; message: string }
  | { type: "match_found"; battle_id: string; opponent_name: string; your_role: "player1" | "player2"; module_name: string; total_rounds: number }
  | { type: "question"; round: number; total: number; question: string; options: string[]; time_limit: number }
  | { type: "answer_received"; round: number }
  | { type: "round_result"; round: number; correct_index: number; p1_correct: boolean; p2_correct: boolean; p1_points_earned: number; p2_points_earned: number; p1_total: number; p2_total: number; p1_answer: number | null; p2_answer: number | null }
  | { type: "battle_end"; winner_id: number | null; p1_final_score: number; p2_final_score: number; p1_credits_earned: number; p2_credits_earned: number; p1_new_credits: number; p2_new_credits: number }
  | { type: "opponent_disconnected"; message: string }
  | { type: "cancelled" }
  | { type: "error"; message: string }
  | { type: "pong" };

interface UseBattleWebSocketOptions {
  userId: number;
  userName: string;
  cohortId: number;
  moduleId: number;
  moduleName: string;
  difficulty?: string;
  onMessage: (msg: BattleMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useBattleWebSocket({
  userId,
  userName,
  cohortId,
  moduleId,
  moduleName,
  difficulty = "medium",
  onMessage,
  onOpen,
  onClose,
}: UseBattleWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
    const wsUrl = backendUrl
      .replace(/^http/, "ws")
      .replace(/\/$/, "");

    const url = `${wsUrl}/arena/ws/player?user_id=${userId}&user_name=${encodeURIComponent(userName)}&cohort_id=${cohortId}&module_id=${moduleId}&module_name=${encodeURIComponent(moduleName)}&difficulty=${difficulty}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as BattleMessage;
        onMessage(msg);
      } catch (e) {
        console.error("Invalid WS message", e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      onClose?.();
    };

    ws.onerror = (e) => {
      console.error("Arena WS error", e);
    };
  }, [userId, userName, cohortId, moduleId, moduleName, difficulty, onMessage, onOpen, onClose]);

  const sendAnswer = useCallback((answerIndex: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "answer", answer_index: answerIndex }));
    }
  }, []);

  const cancel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { connect, sendAnswer, cancel, disconnect, connected };
}
