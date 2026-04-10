"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const NotificationManager: React.FC = () => {
    const pathname = usePathname();
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        const checkNotification = () => {
            const lastCheck = localStorage.getItem('froggy_last_notification');
            const now = Date.now();
            const ONE_HOUR = 60 * 60 * 1000;

            if (!lastCheck || (now - parseInt(lastCheck)) > ONE_HOUR) {
                setShowNotification(true);
                localStorage.setItem('froggy_last_notification', now.toString());
            }
        };

        // Check every minute
        const interval = setInterval(checkNotification, 60000);
        
        // Initial check after 5 seconds
        const timeout = setTimeout(checkNotification, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    // Filter paths: Show only on school pages, but not on admin/login pages
    const isExcluded = pathname === '/' || pathname === '/login' || pathname.startsWith('/school/admin');
    if (isExcluded || !showNotification) return null;

    return (
        <div className="fixed bottom-24 right-6 z-[9998] animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 max-w-[280px]">
                <div className="flex gap-3">
                    <div className="text-3xl">✨</div>
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Time for a breath?</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                            You've been working hard. How about a quick game of Froggy Rain Catcher?
                        </p>
                        <button 
                            onClick={() => setShowNotification(false)}
                            className="mt-3 text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationManager;
