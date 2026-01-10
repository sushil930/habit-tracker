export interface HabitLog {
  [dateIsoString: string]: boolean;
}

export interface HabitFrequency {
  type: 'daily' | 'weekly' | 'monthly';
  goal: number;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  category: string;
  frequency: HabitFrequency;
  reminderTime?: string; // "HH:MM" 24h format
  createdAt: string; // ISO Date string
  logs: HabitLog;
  archived: boolean;
}

export type ViewMode = 'dashboard' | 'analytics' | 'settings' | 'review';
export type TimeRange = 'week' | 'month' | 'year' | 'custom';

export interface WeeklyStats {
  totalCompleted: number;
  completionRate: number;
}

export type ReviewDecision = 'keep' | 'modify' | 'drop';

export interface ReviewItem {
  habitId: string;
  decision: ReviewDecision;
  notes?: string;
}

export interface MonthlyReview {
  id: string;
  period: string; // "YYYY-MM"
  completedAt: string;
  items: ReviewItem[];
}