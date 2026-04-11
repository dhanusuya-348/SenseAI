"use client";

import React, { useMemo } from 'react';
import { GrowthData } from '@/lib/growth';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

interface GrowingTreeProps {
    data: GrowthData;
}

const STAGE_CONFIGS = [
    { threshold: 0, label: 'Seed', levels: 0, branchLength: 0 },
    { threshold: 100, label: 'Sapling', levels: 2, branchLength: 30 },
    { threshold: 500, label: 'Small Tree', levels: 4, branchLength: 50 },
    { threshold: 2000, label: 'Full Grown', levels: 6, branchLength: 80 },
    { threshold: 5000, label: 'Blooming', levels: 6, branchLength: 90, flowers: true },
    { threshold: 10000, label: 'Fruitful', levels: 6, branchLength: 100, flowers: true, fruits: true },
];

export const GrowingTree: React.FC<GrowingTreeProps> = ({ data }) => {
    const { data: session } = useSession();
    const skillsToUse = useMemo(() => {
        // Hardcode skills for the demonstration user or if list is empty
        if (data.skills.length === 0 || session?.user?.email === 'mohanapriya7114@gmail.com') {
            return [
                { id: 101, name: "Python Architecture", color: "#6366f1" }, // Indigo
                { id: 102, name: "Neural Networks", color: "#ec4899" },    // Pink
                { id: 103, name: "AI Ethics", color: "#14b8a6" },         // Teal
                { id: 104, name: "Distributed Systems", color: "#f59e0b" }, // Amber
                { id: 105, name: "Cloud Infrastructure", color: "#8b5cf6" }, // Violet
                { id: 106, name: "Quantum Computing", color: "#3b82f6" },   // Blue
                { id: 107, name: "Edge Computing", color: "#10b981" }       // Emerald
            ];
        }
        return data.skills;
    }, [data.skills, session?.user?.email]);

    const [hoveredSkill, setHoveredSkill] = React.useState<any>(null);

    const stage = useMemo(() => {
        return [...STAGE_CONFIGS].reverse().find(s => data.credits >= s.threshold) || STAGE_CONFIGS[0];
    }, [data.credits]);

    const drawTree = (
        x: number,
        y: number,
        angle: number,
        length: number,
        depth: number,
        skillIndex: number,
        maxDepth: number
    ): React.ReactNode[] => {
        if (depth <= 0 || length <= 0) return [];

        const x2 = x + Math.cos(angle) * length;
        const y2 = y + Math.sin(angle) * length;

        const skill = skillsToUse[skillIndex % skillsToUse.length];
        
        // Generate a deterministic color based on skill ID or name
        const branchColor = skill 
            ? `hsl(${(skill.id * 137.5) % 360}, 40%, 30%)` 
            : '#3D2B1F'; // Darker brown for trunk

        const strokeWidth = depth * 2;

        const branches: React.ReactNode[] = [];

        // Draw current branch with animation and hover tooltip
        branches.push(
            <motion.line
                key={`branch-${depth}-${x}-${y}-${angle}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: (maxDepth - depth) * 0.2, ease: "easeOut" }}
                x1={x}
                y1={y}
                x2={x2}
                y2={y2}
                stroke={branchColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                onMouseEnter={() => setHoveredSkill(skill)}
                onMouseLeave={() => setHoveredSkill(null)}
                className="animate-tree-sway cursor-help hover:stroke-white/80 transition-all duration-300"
                style={{ 
                    filter: hoveredSkill?.id === skill?.id ? "drop-shadow(0 0 8px currentColor)" : "none"
                }}
            >
                <title>{skill?.name || "The Foundation"}</title>
            </motion.line>
        );

        // Add leaves at the nodes and tips
        if (depth < maxDepth - 1) { // Don't add leaves to the main trunk
            const leafColor = skill 
                ? `hsl(${(skill.id * 137.5) % 360}, 70%, 60%)` 
                : '#228B22'; // Emerald green default
            
            const numLeaves = depth === 1 ? 3 : 1;
            for (let i = 0; i < numLeaves; i++) {
                const leafAngle = angle + (Math.random() - 0.5) * 1.5;
                branches.push(
                    <motion.path
                        key={`leaf-${depth}-${x2}-${y2}-${i}-${angle}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.8 }}
                        transition={{ duration: 1, delay: (maxDepth - depth) * 0.3 + 0.5 }}
                        d="M0,0 C2,-5 8,-5 10,0 C8,5 2,5 0,0"
                        transform={`translate(${x2},${y2}) rotate(${leafAngle * 180 / Math.PI}) scale(${1 + depth * 0.5})`}
                        fill={leafColor}
                        className="cursor-help hover:opacity-100 transition-opacity"
                    >
                        <title>{skill?.name || "Growth Tip"}</title>
                    </motion.path>
                );
            }
        }

        // Add flowers or fruits if at high depth (tips of branches)
        if (depth === 1) {
            if (stage.flowers) {
                branches.push(
                    <motion.circle
                        key={`flower-${x2}-${y2}-${angle}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: maxDepth * 0.3 + 1 }}
                        cx={x2}
                        cy={y2}
                        r={4}
                        fill="#FFB7C5" // Sakura pink
                        className="animate-pulse shadow-lg cursor-help"
                        style={{ filter: "drop-shadow(0 0 5px rgba(255, 183, 197, 0.5))" }}
                    >
                        <title>Mastered: {skill?.name}</title>
                    </motion.circle>
                );
            }
            if (stage.fruits) {
                branches.push(
                    <motion.circle
                        key={`fruit-${x2}-${y2}-${angle}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: maxDepth * 0.3 + 1.5 }}
                        cx={x2 + 3}
                        cy={y2 + 3}
                        r={6}
                        fill="#FF4D4D" // Vivid Red
                        onMouseEnter={() => setHoveredSkill(skill)}
                        onMouseLeave={() => setHoveredSkill(null)}
                        className="shadow-xl cursor-help hover:scale-125 transition-transform"
                        style={{ filter: "drop-shadow(0 0 8px rgba(255, 77, 77, 0.4))" }}
                    >
                        <title>Fruit of {skill?.name}</title>
                    </motion.circle>
                );
            }
        }

        // Recursive calls for sub-branches
        const subLength = length * (0.7 + Math.random() * 0.1);
        const subDepth = depth - 1;

        if (subDepth === 0 && (stage.flowers || stage.fruits)) {
            // Add falling petals for cinematic effect
            for (let i = 0; i < 2; i++) {
                branches.push(
                    <motion.circle
                        key={`petal-fall-${x2}-${y2}-${i}-${Math.random()}`}
                        initial={{ opacity: 0, y: 0, x: 0 }}
                        animate={{ 
                            opacity: [0, 0.6, 0],
                            y: [0, 200],
                            x: [0, (Math.random() - 0.5) * 100],
                            rotate: [0, 360]
                        }}
                        transition={{ 
                            duration: 5 + Math.random() * 5, 
                            repeat: Infinity,
                            delay: Math.random() * 10 
                        }}
                        cx={x2}
                        cy={y2}
                        r={2 + Math.random() * 2}
                        fill={stage.fruits ? "#FF4D4D40" : "#FFB7C540"}
                        className="pointer-events-none"
                    />
                );
            }
        }
        
        branches.push(...drawTree(x2, y2, angle - (0.4 + Math.random() * 0.2), subLength, subDepth, skillIndex, maxDepth));
        branches.push(...drawTree(x2, y2, angle + (0.4 + Math.random() * 0.2), subLength, subDepth, skillIndex + 1, maxDepth));

        return branches;
    };

    const fireflies = useMemo(() => {
        return Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            x: 50 + Math.random() * 300,
            y: 50 + Math.random() * 300,
            delay: Math.random() * 5,
            size: 1 + Math.random() * 2
        }));
    }, []);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
            {/* Fireflies Layer */}
            <div className="absolute inset-0 pointer-events-none">
                {fireflies.map(f => (
                    <div 
                        key={f.id}
                        className="absolute rounded-full bg-yellow-200 blur-[1px] animate-firefly"
                        style={{
                            left: `${(f.x / 400) * 100}%`,
                            top: `${(f.y / 400) * 100}%`,
                            width: `${f.size}px`,
                            height: `${f.size}px`,
                            animationDelay: `${f.delay}s`,
                            boxShadow: '0 0 10px #fef08a'
                        }}
                    />
                ))}
            </div>

            <div className="relative w-full h-full flex items-center justify-center p-0">
                <svg width="100%" height="100%" viewBox="0 0 400 400" className="drop-shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-visible">
                    {/* Atmospheric Glow */}
                    <defs>
                        <radialGradient id="treeGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.15)" />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                    </defs>
                    <circle cx="200" cy="250" r="180" fill="url(#treeGlow)" />

                    {/* Ground with shadow */}
                    <motion.ellipse 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.5, scale: 1 }}
                        cx="200" cy="385" rx="140" ry="12" 
                        fill="rgba(0,0,0,0.6)" 
                    />
                    
                    {/* The Tree */}
                    {stage.levels === 0 ? (
                        <motion.g
                            initial={{ scale: 0, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", damping: 12 }}
                        >
                            <circle cx="200" cy="370" r="6" fill="#5D4037" />
                            <path d="M200 370 Q 205 340, 215 350" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round" />
                        </motion.g>
                    ) : (
                        drawTree(200, 390, -Math.PI / 2, stage.branchLength * 1.2, stage.levels, 0, stage.levels)
                    )}
                </svg>
            </div>
            
            {/* Skill Hover HUD */}
            <AnimatePresence>
                {hoveredSkill && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
                    >
                        <div className="bg-black/80 backdrop-blur-xl px-12 py-6 rounded-full border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)] flex flex-col items-center">
                            <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.5em] mb-1">Skill Branch</span>
                            <h2 className="text-4xl font-black text-white tracking-tighter" style={{ color: hoveredSkill.color || 'white' }}>
                                {hoveredSkill.name}
                            </h2>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating HUD Label - Repositioned to Bottom Right */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute bottom-12 right-12 text-center pointer-events-none z-50"
            >
                <div className="bg-white/10 dark:bg-black/60 backdrop-blur-2xl px-10 py-6 rounded-[3rem] border border-white/20 shadow-2xl">
                    <h3 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 drop-shadow-sm uppercase">
                        {stage.label}
                    </h3>
                    <div className="flex items-center justify-center gap-6 mt-3">
                        <span className="text-emerald-400 font-bold text-xs tracking-widest uppercase">Phase {stage.levels}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        <span className="text-white/70 text-xs font-medium tracking-tight whitespace-nowrap">{data.growth_days} Days of Evolution</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
