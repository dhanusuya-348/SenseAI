"use client";

import React, { useEffect, useState } from 'react';
import { GrowingTree } from './GrowingTree';
import { fetchGrowthData, GrowthData } from '@/lib/growth';
import { useSession } from 'next-auth/react';
import { Loader2, Sparkles, TreePine, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GrowingTreeDialogProps {
    open: boolean;
    onClose: () => void;
}

export const GrowingTreeDialog: React.FC<GrowingTreeDialogProps> = ({ open, onClose }) => {
    const { data: session } = useSession();
    const [data, setData] = useState<GrowthData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && session?.user?.id) {
            setLoading(true);
            fetchGrowthData(session.user.id).then(res => {
                setData(res);
                setLoading(false);
            });
        }
    }, [open, session?.user?.id]);

    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#020617]"
                >
                    {/* Animated Mesh Background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-mesh" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 blur-[150px] rounded-full animate-mesh [animation-delay:4s]" />
                        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-500/5 blur-[100px] rounded-full animate-mesh [animation-delay:2s]" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                    </div>

                    {/* Navigation / Close */}
                    <motion.button 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        onClick={onClose}
                        className="absolute top-8 right-8 p-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all z-50 group backdrop-blur-xl"
                    >
                        <X size={24} className="text-white/60 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                    </motion.button>

                    {/* HUD Header */}
                    <div className="absolute top-12 left-12 z-50 pointer-events-none">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-4"
                        >
                            <div className="p-4 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
                                <TreePine size={32} strokeWidth={1.5} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tight text-white/90">Mastery Grove</h2>
                                <p className="text-emerald-400/50 text-xs font-bold uppercase tracking-[0.3em]">SenseAI Ecosystem</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Credits HUD (Right) */}
                    {data && (
                        <div className="absolute top-12 right-28 z-50">
                            <motion.div 
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-2xl flex items-center gap-3 shadow-2xl"
                            >
                                <div className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-500">
                                    <Sparkles size={16} fill="currentColor" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Global Balance</span>
                                    <span className="text-xl font-black text-white tabular-nums">{data.credits.toLocaleString()} <span className="text-[10px] text-white/40 font-medium">CR</span></span>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="relative w-full h-full flex items-center justify-center">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center gap-6">
                                <div className="relative">
                                    <Loader2 className="animate-spin text-emerald-500" size={64} strokeWidth={1} />
                                    <TreePine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500/30" size={24} />
                                </div>
                                <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="text-emerald-400/60 text-sm font-bold uppercase tracking-[0.4em]"
                                >
                                    Snythesizing Growth...
                                </motion.p>
                            </div>
                        ) : data ? (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <GrowingTree data={data} />
                            </div>
                        ) : (
                            <div className="text-center group">
                                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center flex mx-auto mb-6">
                                    <X size={32} className="text-red-500" />
                                </div>
                                <p className="text-white/40 font-medium mb-6">Connection lost to the Mastery Grove.</p>
                                <button 
                                    onClick={() => session?.user?.id && fetchGrowthData(session.user.id).then(setData)}
                                    className="px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all hover:scale-105 active:scale-95"
                                >
                                    Re-Initialize
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Decorative Footer */}
                    <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center pointer-events-none">
                        <div className="text-[10px] text-white/20 font-mono tracking-widest">SECURE_SYNC_v3.2</div>
                        <div className="flex gap-4">
                            {data?.skills.slice(0, 3).map((s, i) => (
                                <motion.div 
                                    key={s.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.5 + (i * 0.1) }}
                                    className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-white/40 font-bold uppercase tracking-tighter"
                                >
                                    {s.name}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
