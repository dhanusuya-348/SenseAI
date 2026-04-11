import React, { useState, useEffect, useCallback, useRef } from "react";
import LearnerCourseView from "./LearnerCourseView";
import LearningStreak from "./LearningStreak";
import TopPerformers from "./TopPerformers";
import { Module } from "@/types/course";
import { useAuth } from "@/lib/auth";
import { Course, Cohort } from "@/types";
import { ChevronDown } from "lucide-react";
import MobileDropdown, { DropdownOption } from "./MobileDropdown";
import confetti from "canvas-confetti";
import { unlockModule } from "@/lib/api";
import { Lock, Coins, Sparkles, Info, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Constants for localStorage keys
const LAST_INCREMENT_DATE_KEY = 'streak_last_increment_date';
const LAST_STREAK_COUNT_KEY = 'streak_last_count';

// Mobile tab options
enum MobileTab {
    Course = 'course',
    Progress = 'progress'
}

interface LearnerCohortViewProps {
    courseTitle: string;
    modules: Module[];
    schoolId?: string;
    cohortId?: string;
    streakDays?: number;
    activeDays?: string[];
    completedTaskIds?: Record<string, boolean>;
    completedQuestionIds?: Record<string, Record<string, boolean>>;
    courses?: Course[];
    onCourseSelect?: (index: number) => void;
    activeCourseIndex?: number;
    taskId?: string | null;
    questionId?: string | null;
    onUpdateTaskAndQuestionIdInUrl?: (taskId: string | null, questionId: string | null) => void;
}

interface StreakData {
    streak_count: number;
    active_days: string[]; // Format: YYYY-MM-DD
}

export default function LearnerCohortView({
    courseTitle,
    modules,
    schoolId,
    cohortId,
    streakDays = 0,
    activeDays = [],
    completedTaskIds = {},
    completedQuestionIds = {},
    courses = [],
    onCourseSelect,
    activeCourseIndex = 0,
    taskId = null,
    questionId = null,
    onUpdateTaskAndQuestionIdInUrl = () => {},
}: LearnerCohortViewProps) {
    // Add state to manage completed tasks and questions
    const [localCompletedTaskIds, setLocalCompletedTaskIds] = useState<Record<string, boolean>>(completedTaskIds);
    const [localCompletedQuestionIds, setLocalCompletedQuestionIds] = useState<Record<string, Record<string, boolean>>>(completedQuestionIds);

    // State to track whether to show the TopPerformers component
    const [showTopPerformers, setShowTopPerformers] = useState<boolean>(true);

    // State for mobile course dropdown
    const [mobileDropdownOpen, setMobileDropdownOpen] = useState<boolean>(false);
    const courseDropdownRef = useRef<HTMLDivElement>(null);

    // State for the active mobile tab
    const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>(MobileTab.Course);

    // Credit System State
    const [userCredits, setUserCredits] = useState<number>(0);
    const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
    const [selectedModuleToUnlock, setSelectedModuleToUnlock] = useState<Module | null>(null);

    // Credit Popup State
    const [showCreditPopup, setShowCreditPopup] = useState<boolean>(false);
    const [earnedCredits, setEarnedCredits] = useState<number>(0);
    const popupTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs for course tab scrolling functionality
    const courseTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const isInitialCourseLoad = useRef(true);

    // Add useEffect to update local state when props change
    useEffect(() => {
        setLocalCompletedTaskIds(completedTaskIds);
    }, [completedTaskIds]);

    useEffect(() => {
        setLocalCompletedQuestionIds(completedQuestionIds);
    }, [completedQuestionIds]);

    // Scroll to active course tab on initial load
    useEffect(() => {
        if (isInitialCourseLoad.current && courseTabRefs.current[activeCourseIndex] && courses.length > 1) {
            const activeTab = courseTabRefs.current[activeCourseIndex];
            if (activeTab) {
                activeTab.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
                isInitialCourseLoad.current = false;
            }
        }
    }, [activeCourseIndex, courses.length]);

    // Reset scroll flag when courses array changes (like switching cohorts)
    useEffect(() => {
        if (courses.length > 0) {
            isInitialCourseLoad.current = true;
        }
    }, [courses]);

    // Add state for streak data
    const [streakCount, setStreakCount] = useState<number>(streakDays);
    const [activeWeekDays, setActiveWeekDays] = useState<string[]>(activeDays);
    const [isLoadingStreak, setIsLoadingStreak] = useState<boolean>(false);

    // Get user from auth context
    const { user } = useAuth();
    const userId = user?.id || '';

    // Initialize credits from user object
    useEffect(() => {
        if (user?.credits !== undefined) {
            setUserCredits(user.credits);
        }
    }, [user?.credits]);

    // Use refs for last increment tracking to avoid dependency cycles
    const lastIncrementDateRef = useRef<string | null>(null);
    const lastStreakCountRef = useRef<number>(streakDays);
    const isInitialLoadRef = useRef(true);

    // Load persisted values from localStorage when component mounts
    useEffect(() => {
        if (typeof window === 'undefined' || !userId || !cohortId) return;

        const storageKeyDate = `${LAST_INCREMENT_DATE_KEY}_${userId}_${cohortId}`;
        const storageKeyCount = `${LAST_STREAK_COUNT_KEY}_${userId}_${cohortId}`;

        const storedDate = localStorage.getItem(storageKeyDate);
        if (storedDate) {
            lastIncrementDateRef.current = storedDate;
        }

        const storedCount = localStorage.getItem(storageKeyCount);
        if (storedCount) {
            lastStreakCountRef.current = parseInt(storedCount, 10);
        }
    }, [userId, cohortId]);

    // Function to convert date to day of week abbreviation (S, M, T, W, T, F, S)
    const convertDateToDayOfWeek = useCallback((dateString: string): string => {
        const date = new Date(dateString);
        const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday, etc.

        // Return unique identifiers for each day, with position index to distinguish Sunday (0) and Saturday (6)
        // This allows us to still show "S" for both Saturday and Sunday in the UI,
        // but have a way to uniquely identify them internally
        const dayIdentifiers = ["S_0", "M", "T", "W", "T", "F", "S_6"];
        return dayIdentifiers[dayIndex];
    }, []);

    // Get today's date in YYYY-MM-DD format
    const getTodayDateString = useCallback((): string => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }, []);

    // Check if we already incremented streak today
    const isStreakIncrementedToday = useCallback((): boolean => {
        return lastIncrementDateRef.current === getTodayDateString();
    }, [getTodayDateString]);

    // Create a fetchStreakData function that can be reused
    const fetchStreakData = useCallback(async () => {
        // Only fetch if we have both user ID and cohort ID
        if (!userId || !cohortId) return;

        // Don't fetch if streak was already incremented today
        if (isStreakIncrementedToday() && !isInitialLoadRef.current) {
            return;
        }

        // Clear the initial load flag
        isInitialLoadRef.current = false;

        setIsLoadingStreak(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${userId}/streak?cohort_id=${cohortId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch streak data: ${response.status}`);
            }

            const data: StreakData = await response.json();

            // Check if streak count has increased since last fetch
            const hasStreakIncremented = data.streak_count > lastStreakCountRef.current;

            // If streak has increased, save today as the last increment date
            if (hasStreakIncremented) {

                const today = getTodayDateString();
                lastIncrementDateRef.current = today;

                // Save to localStorage
                localStorage.setItem(
                    `${LAST_INCREMENT_DATE_KEY}_${userId}_${cohortId}`,
                    today
                );

                if (!showTopPerformers) {
                    // If streak has been incremented today, show the TopPerformers component
                    setShowTopPerformers(true);
                }
            }

            // Update last streak count
            lastStreakCountRef.current = data.streak_count;
            localStorage.setItem(
                `${LAST_STREAK_COUNT_KEY}_${userId}_${cohortId}`,
                data.streak_count.toString()
            );

            // Set streak count and active days in state
            setStreakCount(data.streak_count);
            const dayAbbreviations = data.active_days.map(convertDateToDayOfWeek);
            setActiveWeekDays(dayAbbreviations);

        } catch (error) {
            console.error("Error fetching streak data:", error);
            // Keep existing values on error
        } finally {
            setIsLoadingStreak(false);
        }
    }, [userId, cohortId, convertDateToDayOfWeek, getTodayDateString, isStreakIncrementedToday, showTopPerformers]);

    // Fetch streak data when component mounts or when dependencies change
    useEffect(() => {
        if (userId && cohortId) {
            fetchStreakData();
        }
    }, [userId, cohortId, fetchStreakData]);

    // Handle dialog close event to refresh streak data
    const handleDialogClose = useCallback(() => {
        if (!isStreakIncrementedToday()) {
            fetchStreakData();
        }
    }, [fetchStreakData, isStreakIncrementedToday]);

    // Handler for task completion updates
    const handleTaskComplete = useCallback((taskId: string, isComplete: boolean, creditsEarned: number = 0) => {
        setLocalCompletedTaskIds(prev => ({
            ...prev,
            [taskId]: isComplete
        }));

        // If credits were earned, show the popup and update balance
        if (creditsEarned > 0) {
            triggerCreditPopup(creditsEarned);
            setUserCredits(prev => {
                const newCredits = prev + creditsEarned;
                // Dispatch event to update global header
                window.dispatchEvent(new CustomEvent('user-credits-updated', { 
                    detail: { credits: newCredits } 
                }));
                return newCredits;
            });
        }

        // If a task was completed, check for streak update after a small delay
        if (isComplete && !isStreakIncrementedToday()) {
            setTimeout(() => {
                fetchStreakData();
            }, 500);
        }
    }, [fetchStreakData, isStreakIncrementedToday]);

    // Handler for question completion updates
    const handleQuestionComplete = useCallback((taskId: string, questionId: string, isComplete: boolean) => {
        setLocalCompletedQuestionIds(prev => {
            const updatedQuestionIds = { ...prev };

            // Initialize the object for this task if it doesn't exist
            if (!updatedQuestionIds[taskId]) {
                updatedQuestionIds[taskId] = {};
            }

            // Mark this question as complete
            updatedQuestionIds[taskId] = {
                ...updatedQuestionIds[taskId],
                [questionId]: isComplete
            };

            return updatedQuestionIds;
        });

        // If a question was completed, check for streak update after a small delay
        if (isComplete) {
            // Award celebratory feedback
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00ffcc', '#0099ff', '#ffffff']
            });

            if (!isStreakIncrementedToday()) {
                setTimeout(() => {
                    fetchStreakData();
                }, 500);
            }
        }
    }, [fetchStreakData, isStreakIncrementedToday]);

    // Function to trigger credit earned popup
    const triggerCreditPopup = (amount: number) => {
        if (amount <= 0) return;
        
        setEarnedCredits(amount);
        setShowCreditPopup(true);
        
        if (popupTimerRef.current) {
            clearTimeout(popupTimerRef.current);
        }
        
        popupTimerRef.current = setTimeout(() => {
            setShowCreditPopup(false);
        }, 4000);
    };

    // Handler for module unlocking
    const handleUnlockModule = async () => {
        if (!selectedModuleToUnlock || !userId) return;

        setIsUnlocking(true);
        try {
            const result = await unlockModule(Number(selectedModuleToUnlock.id), Number(userId));
            if (result.success) {
                setUserCredits(result.credits_remaining);
                // Dispatch event to update global header
                window.dispatchEvent(new CustomEvent('user-credits-updated', { 
                    detail: { credits: result.credits_remaining } 
                }));
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.5 },
                    colors: ['#FFD700', '#FFA500', '#ffffff']
                });
                
                // Refresh to update module statuses
                window.location.reload(); 
            }
        } catch (error: any) {
            console.error("Unlock failed:", error);
            alert(error.message || "Failed to unlock module. Not enough credits?");
        } finally {
            setIsUnlocking(false);
            setSelectedModuleToUnlock(null);
        }
    };

    // Determine if sidebar should be shown
    const showSidebar = cohortId ? true : false;

    // Convert courses to dropdown options
    const courseOptions: DropdownOption<number>[] = courses.map((course, index) => ({
        id: course.id,
        label: course.name,
        value: index
    }));

    // Handle course selection
    const handleCourseSelect = (index: number) => {
        if (onCourseSelect) {
            onCourseSelect(index);
        }
    };

    // Handle course selection from dropdown
    const handleCourseDropdownSelect = (option: DropdownOption<number>) => {
        if (onCourseSelect) {
            onCourseSelect(option.value);
        }
    };

    // Callback for when TopPerformers has no data
    const handleEmptyPerformersData = useCallback((isEmpty: boolean) => {
        setShowTopPerformers(!isEmpty);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
                setMobileDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const getActiveCourse = () => {
        return courses[activeCourseIndex] || null;
    };

    // Clean up event listeners when component unmounts
    useEffect(() => {
        return () => {
            if (typeof document !== 'undefined') {
                document.body.style.overflow = '';
            }
        };
    }, []);

    return (
        <>
        <div className="bg-white dark:bg-black min-h-screen pb-16 lg:pb-0" role="main">
            {courseTitle && (
                <h1 className="text-2xl md:text-3xl font-light mb-4 md:mb-6 px-1 sm:px-0 text-black dark:text-white">
                    {courseTitle}
                </h1>
            )}

            <div className="lg:flex lg:flex-row lg:justify-between">
                {/* Left Column: Course Tabs and Course Content */}
                <div className={`lg:w-2/3 lg:pr-8 ${showSidebar && activeMobileTab === MobileTab.Progress ? 'hidden lg:block' : ''}`}>
                    {/* Course Selector */}
                    {courses.length > 1 && (
                        <div className="mb-8 sm:mb-10">
                            {/* Desktop Tabs - Hidden on Mobile */}
                            <div className="hidden sm:block w-full">
                                <div className="flex items-center border-b overflow-x-auto scrollbar-hide border-gray-300 dark:border-gray-900">
                                    {courses.map((course, index) => (
                                        <button
                                            key={course.id}
                                            className={`px-8 py-4 text-base md:text-lg tracking-wide whitespace-nowrap transition-all duration-200 cursor-pointer flex-shrink-0 relative group ${index === activeCourseIndex
                                                ? 'text-black dark:text-white font-light'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-light'
                                                }`}
                                            onClick={() => {
                                                handleCourseSelect(index);
                                            }}
                                            ref={el => { courseTabRefs.current[index] = el; }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="relative z-10">{course.name}</span>
                                            </div>

                                            {/* Active indicator - visible only for active tab */}
                                            {index === activeCourseIndex && (
                                                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-black dark:bg-white" />
                                            )}

                                            {/* Hover indicator - visible only on hover for inactive tabs */}
                                            {index !== activeCourseIndex && (
                                                <div className="absolute bottom-0 left-0 right-0 h-[1px] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left bg-gray-300 dark:bg-gray-700" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Course Selector - Visible only on small screens */}
                            <div className="sm:hidden">
                                {/* Current course indicator */}
                                <button
                                    onClick={() => setMobileDropdownOpen(true)}
                                    className="w-full text-left py-3 px-1 border-b flex items-center justify-between cursor-pointer group transition-opacity border-gray-300 dark:border-gray-800"
                                    aria-haspopup="true"
                                >
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Current Course</div>
                                        <div className="font-light text-black dark:text-white">{getActiveCourse()?.name || "Select Course"}</div>
                                    </div>
                                    <div className="rounded-full p-2 opacity-70 group-hover:opacity-100 transition-opacity bg-gray-200 dark:bg-gray-800">
                                        <ChevronDown size={16} className="text-black dark:text-white" />
                                    </div>
                                </button>
                            </div>

                            {/* Mobile Dropdown using MobileDropdown component */}
                            <MobileDropdown
                                isOpen={mobileDropdownOpen}
                                onClose={() => setMobileDropdownOpen(false)}
                                title="Select Course"
                                options={courseOptions}
                                selectedId={getActiveCourse()?.id}
                                onSelect={handleCourseDropdownSelect}
                                contentClassName="bg-[#0f0f0f]"
                                selectedOptionClassName="text-white"
                                optionClassName="text-gray-400 hover:text-white"
                            />
                        </div>
                    )}

                    {/* Course Content */}
                    <div>
                        <LearnerCourseView
                            modules={modules}
                            completedTaskIds={localCompletedTaskIds}
                            completedQuestionIds={localCompletedQuestionIds}
                            onTaskComplete={handleTaskComplete}
                            onQuestionComplete={handleQuestionComplete}
                            onDialogClose={handleDialogClose}
                            onUnlockModule={(moduleId) => {
                                const module = modules.find(m => m.id === moduleId);
                                if (module) setSelectedModuleToUnlock(module);
                            }}
                            taskId={taskId}
                            questionId={questionId}
                            onUpdateTaskAndQuestionIdInUrl={onUpdateTaskAndQuestionIdInUrl}
                        />
                    </div>
                </div>

                {/* Right Column: Streak, Credits and Performers */}
                {showSidebar && (
                    <div className={`w-full lg:w-1/3 space-y-6 mt-6 lg:mt-0 ${activeMobileTab === MobileTab.Course ? 'hidden lg:block' : ''}`}>
                        {/* Credits Balance Display */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#111] to-[#000] border border-gray-800 shadow-2xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles size={60} className="text-amber-400" />
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <Coins className="text-amber-500" size={20} />
                                </div>
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Credit Balance</h3>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-light text-white tracking-tighter">{userCredits}</span>
                                <span className="text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">CREDITS</span>
                            </div>
                            <p className="mt-4 text-xs text-gray-500 leading-relaxed italic">
                                Complete tasks to earn more credits and unlock advanced courses.
                            </p>
                        </div>

                        {/* Streak component when not loading and cohort ID exists */}
                        {!isLoadingStreak && cohortId && (
                            <LearningStreak
                                streakDays={streakCount}
                                activeDays={activeWeekDays}
                            />
                        )}

                        {/* Only show TopPerformers if showTopPerformers is true */}
                        {showTopPerformers && (
                            <TopPerformers
                                schoolId={schoolId}
                                cohortId={cohortId}
                                view='learner'
                            // onEmptyData={handleEmptyPerformersData}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Mobile Bottom Tabs - Only visible on mobile */}
            {showSidebar && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t z-20 bg-gradient-to-t from-white to-[rgba(255,255,255,0.9)] dark:from-black dark:to-[rgba(0,0,0,0.9)] border-gray-300 dark:border-gray-900">
                    <div className="flex h-16">
                        <button
                            className={`flex-1 flex flex-col items-center justify-center transition-colors ${activeMobileTab === MobileTab.Course
                                ? 'text-black dark:text-white'
                                : 'text-gray-500'
                                }`}
                            onClick={() => setActiveMobileTab(MobileTab.Course)}
                        >
                            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                            <span className="text-xs font-light">Course</span>
                        </button>
                        <button
                            className={`flex-1 flex flex-col items-center justify-center transition-colors ${activeMobileTab === MobileTab.Progress
                                ? 'text-black dark:text-white'
                                : 'text-gray-500'
                                }`}
                            onClick={() => setActiveMobileTab(MobileTab.Progress)}
                        >
                            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span className="text-xs font-light">Progress</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        {/* Unlock Module Modal */}
        {selectedModuleToUnlock && (() => {
            const module = selectedModuleToUnlock;
            return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#0f0f0f] border border-gray-800 rounded-3xl p-8 shadow-2xl relative">
                        <button 
                            onClick={() => setSelectedModuleToUnlock(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex justify-center mb-6">
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                                <Lock size={32} className="text-amber-500" />
                            </div>
                        </div>
                        
                        <h2 className="text-2xl font-light text-center text-white mb-2">Unlock Module</h2>
                        <p className="text-gray-400 text-center mb-8 font-light">
                            Unlock <span className="text-white font-medium">{module.title}</span> to access its tasks and continue learning.
                        </p>
                        
                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10">
                                <span className="text-gray-400">Unlock Cost</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-medium text-white">{module.unlock_cost}</span>
                                    <Coins size={16} className="text-amber-500" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10">
                                <span className="text-gray-400">Your Credits</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xl font-medium ${userCredits >= (module.unlock_cost || 0) ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {userCredits}
                                    </span>
                                    <Coins size={16} className="text-amber-500" />
                                </div>
                            </div>
                        </div>

                        {userCredits < (module.unlock_cost || 0) ? (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6 flex items-start gap-3">
                                <Info size={16} className="mt-0.5 flex-shrink-0" />
                                <p>You need { (module.unlock_cost || 0) - userCredits } more credits to unlock this module. Keep completing tasks!</p>
                            </div>
                        ) : null}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedModuleToUnlock(null)}
                                className="flex-1 py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isUnlocking || userCredits < (module.unlock_cost || 0)}
                                onClick={handleUnlockModule}
                                className={`flex-1 py-4 px-6 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 
                                    ${userCredits < (module.unlock_cost || 0) 
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                        : 'bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 active:scale-95'}`}
                            >
                                {isUnlocking ? (
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Unlock Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            );
        })()}

        {/* Credit Earned Popup */}
        <AnimatePresence>
            {showCreditPopup && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 50 }}
                    className="fixed bottom-24 right-8 z-[100] pointer-events-none"
                >
                    <div className="bg-gradient-to-r from-amber-400 to-amber-600 p-[1px] rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                        <div className="bg-[#0f0f0f] px-6 py-4 rounded-[15px] flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                                <Zap className="text-amber-500 fill-amber-500" size={20} />
                            </div>
                            <div>
                                <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">Task Completed!</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-light text-white tracking-tighter">+{earnedCredits}</span>
                                    <span className="text-xs text-gray-400 font-medium tracking-wide">CREDITS</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
}