"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useThemePreference } from '@/lib/hooks/useThemePreference';

interface FroggyGameProps {
  onGameOver: (score: number) => void;
  onClose: () => void;
}

const FroggyGame: React.FC<FroggyGameProps> = ({ onGameOver, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDarkMode } = useThemePreference();
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [isGameActive, setIsGameActive] = useState(true);
  const [isSoundOn, setIsSoundOn] = useState(true);
  
  // Game State Refs (to avoid re-renders)
  const scoreRef = useRef(0);
  const missesRef = useRef(0);
  const frogX = useRef(200);
  const mouseX = useRef(200);
  const raindrops = useRef<any[]>([]);
  const particles = useRef<any[]>([]);
  const clouds = useRef<any[]>([]);
  const tongueTarget = useRef<any>(null);
  const tongueTimer = useRef(0);
  const frameId = useRef<number | null>(null);
  const screenShake = useRef(0);

  // Constants
  const FROG_Y = 320;
  const FROG_SIZE = 40;
  const LILY_WIDTH = 80;
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 400;

  // Colors
  const colors = {
    sky: isDarkMode ? '#0F172A' : '#E0F2FE',
    frog: isDarkMode ? '#4ADE80' : '#22C55E',
    rain: isDarkMode ? '#60A5FA' : '#38BDF8',
    lily: isDarkMode ? '#065F46' : '#15803D',
    cloud: isDarkMode ? '#1E293B' : '#F8FAFC',
    gold: '#FACC15',
    text: isDarkMode ? '#F8FAFC' : '#0F172A',
  };

  // Initialize clouds
  useEffect(() => {
    clouds.current = Array.from({ length: 5 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * 100 + 20,
      size: Math.random() * 40 + 20,
      speed: Math.random() * 0.5 + 0.2,
    }));
  }, []);

  const spawnRaindrop = useCallback(() => {
    const isGold = Math.random() > 0.9;
    raindrops.current.push({
      x: Math.random() * (CANVAS_WIDTH - 20) + 10,
      y: -20,
      speed: Math.random() * 2 + 2,
      isGold,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.05 + 0.02,
    });
  }, []);

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
        particles.current.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1.0,
            color,
            size: Math.random() * 3 + 1,
        });
    }
  };

  const update = () => {
    if (!isGameActive) return;

    // Update screen shake
    if (screenShake.current > 0) screenShake.current *= 0.9;
    if (screenShake.current < 0.1) screenShake.current = 0;

    // Smooth frog movement
    frogX.current += (mouseX.current - frogX.current) * 0.15;

    // Spawn drops
    if (Math.random() < 0.03) spawnRaindrop();

    // Update drops
    for (let i = raindrops.current.length - 1; i >= 0; i--) {
      const drop = raindrops.current[i];
      drop.y += drop.speed;
      drop.wobble += drop.wobbleSpeed;
      drop.x += Math.sin(drop.wobble) * 0.5;

      // Collision detection (Frog mouth area)
      const dx = drop.x - frogX.current;
      const dy = drop.y - FROG_Y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 35) {
        // Catch!
        tongueTarget.current = { x: drop.x, y: drop.y };
        tongueTimer.current = 10;
        
        if (drop.isGold) {
            screenShake.current = 10;
        }

        const points = drop.isGold ? 3 : 1;
        scoreRef.current += points;
        setScore(scoreRef.current);
        
        createParticles(drop.x, drop.y, drop.isGold ? colors.gold : colors.rain);
        raindrops.current.splice(i, 1);
        continue;
      }

      if (drop.y > CANVAS_HEIGHT) {
        // Miss!
        missesRef.current += 1;
        setMisses(missesRef.current);
        raindrops.current.splice(i, 1);
        
        if (missesRef.current >= 3) {
          setIsGameActive(false);
          onGameOver(scoreRef.current);
        }
      }
    }

    // Update tongue
    if (tongueTimer.current > 0) tongueTimer.current--;

    // Update particles
    for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.current.splice(i, 1);
    }

    // Update clouds
    clouds.current.forEach(cloud => {
      cloud.x += cloud.speed;
      if (cloud.x > CANVAS_WIDTH + 50) cloud.x = -50;
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Apply screen shake
    ctx.save();
    if (screenShake.current > 0) {
        const sx = (Math.random() - 0.5) * screenShake.current;
        const sy = (Math.random() - 0.5) * screenShake.current;
        ctx.translate(sx, sy);
    }

    // Background Sky
    ctx.fillStyle = colors.sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Clouds (Subtle Parallax)
    ctx.fillStyle = colors.cloud;
    ctx.globalAlpha = 0.4;
    clouds.current.forEach(cloud => {
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
      ctx.arc(cloud.x + 20, cloud.y - 10, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.arc(cloud.x - 20, cloud.y - 10, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Lily Pad
    ctx.fillStyle = colors.lily;
    ctx.beginPath();
    ctx.ellipse(frogX.current, FROG_Y + 35, LILY_WIDTH / 2, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    // Slice in lily pad
    ctx.fillStyle = colors.sky;
    ctx.beginPath();
    ctx.moveTo(frogX.current, FROG_Y + 35);
    ctx.lineTo(frogX.current + 40, FROG_Y + 25);
    ctx.lineTo(frogX.current + 40, FROG_Y + 45);
    ctx.fill();

    // Tongue Animation
    if (tongueTimer.current > 0 && tongueTarget.current) {
        ctx.strokeStyle = '#F87171'; // Soft pink
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(frogX.current, FROG_Y);
        ctx.lineTo(tongueTarget.current.x, tongueTarget.current.y);
        ctx.stroke();
    }

    // Frog
    const breathing = Math.sin(Date.now() / 400) * 2;
    ctx.fillStyle = colors.frog;
    // Body
    ctx.beginPath();
    ctx.ellipse(frogX.current, FROG_Y + 10, 25, 20 + breathing, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.arc(frogX.current, FROG_Y - 5, 18, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    const blinking = Math.sin(Date.now() / 1500) > 0.95;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(frogX.current - 10, FROG_Y - 12, 6, 0, Math.PI * 2);
    ctx.arc(frogX.current + 10, FROG_Y - 12, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    if (!blinking) {
        ctx.beginPath();
        ctx.arc(frogX.current - 10, FROG_Y - 12, 3, 0, Math.PI * 2);
        ctx.arc(frogX.current + 10, FROG_Y - 12, 3, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillRect(frogX.current - 14, FROG_Y - 13, 8, 2);
        ctx.fillRect(frogX.current + 6, FROG_Y - 13, 8, 2);
    }

    // Raindrops
    raindrops.current.forEach(drop => {
      ctx.fillStyle = drop.isGold ? colors.gold : colors.rain;
      if (drop.isGold) ctx.shadowBlur = 10;
      if (drop.isGold) ctx.shadowColor = colors.gold;
      
      const stretch = Math.min(drop.speed * 2, 10);
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y - 8);
      ctx.bezierCurveTo(
        drop.x - 5, drop.y + stretch,
        drop.x + 5, drop.y + stretch,
        drop.x, drop.y - 8
      );
      ctx.fill();
      
      ctx.shadowBlur = 0;
    });

    // Particles
    particles.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // UI Overlay (Score)
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 30);
    
    // Misses (Little hearts or dots)
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < misses ? '#EF4444' : '#94A3B8';
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH - 20 - (i * 20), 25, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      update();
      draw(ctx);
      frameId.current = requestAnimationFrame(gameLoop);
    };

    frameId.current = requestAnimationFrame(gameLoop);
    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, [isGameActive, isDarkMode]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    mouseX.current = Math.max(20, Math.min(CANVAS_WIDTH - 20, x));
  };

  return (
    <div className="relative flex flex-col items-center bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl p-4 transition-all duration-500 animate-in fade-in zoom-in">
      <div className="flex justify-between w-full mb-4 items-center">
        <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold dark:text-white">Froggy Rain Catcher</h2>
            <button 
                onClick={() => setIsSoundOn(!isSoundOn)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
                title={isSoundOn ? "Mute Sound" : "Unmute Sound"}
            >
                {isSoundOn ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                )}
            </button>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dark:text-white"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      
      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          className="rounded-xl cursor-none touch-none shadow-inner bg-sky-50 dark:bg-slate-800"
        />
        {!isGameActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl animate-in fade-in duration-300">
            <h3 className="text-4xl font-black text-white mb-2">Game Over!</h3>
            <p className="text-xl text-emerald-400 mb-6 font-bold">Score: {score}</p>
            <button 
              onClick={() => {
                scoreRef.current = 0;
                missesRef.current = 0;
                setScore(0);
                setMisses(0);
                raindrops.current = [];
                setIsGameActive(true);
              }}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold shadow-lg transform hover:scale-105 transition-all"
            >
              Try Again 🐸
            </button>
          </div>
        )}
      </div>
      
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium italic">
        Catch the drops! Golden drops = 3x points ✨
      </p>
    </div>
  );
};

export default FroggyGame;
