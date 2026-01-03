export interface HabitLog {
  [dateIsoString: string]: boolean;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  category: string;
  createdAt: string; // ISO Date string
  logs: HabitLog;
  archived: boolean;
}

export type ViewMode = 'dashboard' | 'analytics' | 'settings';
export type TimeRange = 'week' | 'month' | 'year' | 'custom';

export interface WeeklyStats {
  totalCompleted: number;
  completionRate: number;
}