"use client";

import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';

interface CreateCourseDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (courseData: { id: string; name: string }) => void;
    schoolId?: string | number;
}

export default function CreateCourseDialog({
    open,
    onClose,
    onSuccess,
    schoolId,
}: CreateCourseDialogProps) {
    const [courseName, setCourseName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reset form state when dialog is opened
    useEffect(() => {
        if (open) {
            setCourseName('');
            setError('');
            setIsLoading(false);
        }
    }, [open]);

    const handleSubmit = async () => {
        // Validate course name
        if (!courseName.trim()) {
            setError('Course name is required');
            return;
        }

        try {
            setIsLoading(true);

            // Make API request to create course
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: courseName,
                    org_id: Number(schoolId)
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create course');
            }

            const data = await response.json();

            // Reset form
            setCourseName('');
            setError('');

            // Call the success callback with the created course data
            if (onSuccess) {
                onSuccess({
                    id: data.id,
                    name: courseName
                });
            }

        } catch (err) {
            console.error("Error creating course:", err);
            setError('Failed to create course. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl shadow-2xl bg-white dark:bg-[#1A1A1A] text-black dark:text-white border border-gray-200 dark:border-white/10 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Dialog Content */}
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight">Create New Course</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Set up your course structure and access controls.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium ml-1">Course Name</label>
                            <input
                                id="courseName"
                                type="text"
                                value={courseName}
                                onChange={(e) => {
                                    setCourseName(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="e.g. Mastering AI Agents"
                                className={`w-full px-4 py-3 rounded-xl font-light outline-none bg-gray-50 dark:bg-[#0D0D0D] text-black dark:text-white border transition-all ${error ? 'border-red-500' : 'border-gray-200 dark:border-white/5 focus:border-purple-500'}`}
                                disabled={isLoading}
                            />
                            {error && (
                                <p className="mt-1 text-xs text-red-500 ml-1">{error}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dialog Footer */}
                <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 dark:bg-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`px-8 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 ${isLoading ? 'bg-purple-600/70 cursor-wait' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'} text-white`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating...
                            </>
                        ) : 'Create Course'}
                    </button>
                </div>
            </div>
        </div>
    );
}
