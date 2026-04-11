import { QuizQuestion } from "./quiz";
export interface LearningMaterial {
  id: string;
  title: string;
  position: number;
  type: 'material';
  content?: any[]; // Using any[] for content blocks
  status?: string; // Add status field to track draft/published state
  scheduled_publish_at: string | null;
  isGenerating?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Quiz {
  id: string;
  title: string;
  position: number;
  type: 'quiz';
  numQuestions?: number;
  questions: QuizQuestion[];
  status?: string; // Add status field to track draft/published state
  scheduled_publish_at: string | null;
  isGenerating?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Assignment {
  id: string;
  title: string;
  position: number;
  type: 'assignment';
  status?: string;
  scheduled_publish_at: string | null;
  isGenerating?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export type ModuleItem = LearningMaterial | Quiz | Assignment;

export interface Module {
  id: string;
  title: string;
  position: number;
  items: ModuleItem[];
  isExpanded?: boolean;
  backgroundColor?: string;
  isEditing?: boolean;
  progress?: number;
  unlockAt?: string;
  unlock_cost?: number;
  is_locked?: boolean;
  admin_locked?: boolean;  // Admin-forced lock (separate from credit-based locking)
  is_free?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CourseDetails {
  id: number | string;
  name: string;
  description?: string;
  modules?: Module[];
}

export interface DripConfig {
    is_drip_enabled: boolean;
    frequency_value: number;
    frequency_unit: string;
    publish_at: Date | null;
}