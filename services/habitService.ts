import { Habit } from '../types';
import { startOfDay, subDays, isSameDay, format, parseISO } from 'date-fns';

const STORAGE_KEY = 'habitflow_data_v1';
const ONBOARDING_KEY = 'habitflow_onboarded_v1';

export const loadHabits = (): Habit[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    // Migration: ensure category exists
    return parsed.map((h: any) => ({
      ...h,
      category: h.category || 'General',
    }));
  } catch (e) {
    console.error("Failed to load habits", e);
    return [];
  }
};

export const saveHabits = (habits: Habit[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error("Failed to save habits", e);
  }
};

export const clearAllData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_KEY); // Reset onboarding too
  } catch (e) {
    console.error("Failed to clear data", e);
  }
};

export const hasCompletedOnboarding = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

export const setOnboardingCompleted = () => {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (e) {
    console.error("Failed to save onboarding status", e);
  }
};

export const validateBackup = (data: any): data is Habit[] => {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  // Basic structural check
  return data.every(item => 
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.logs === 'object'
  );
};

export const calculateStreak = (habit: Habit): number => {
  let streak = 0;
  const today = startOfDay(new Date());
  
  // Check if completed today, if so start from today, else start from yesterday
  const todayStr = format(today, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
  
  let currentCheckDate = today;
  
  if (!habit.logs[todayStr] && !habit.logs[yesterdayStr]) {
    return 0;
  }
  
  if (!habit.logs[todayStr] && habit.logs[yesterdayStr]) {
    currentCheckDate = subDays(today, 1);
  }

  // Iterate backwards
  while (true) {
    const dateStr = format(currentCheckDate, 'yyyy-MM-dd');
    if (habit.logs[dateStr]) {
      streak++;
      currentCheckDate = subDays(currentCheckDate, 1);
    } else {
      break;
    }
  }
  
  return streak;
};

export const calculateCompletionRate = (habit: Habit, days = 30): number => {
  let completed = 0;
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    if (habit.logs[dateStr]) completed++;
  }
  
  return Math.round((completed / days) * 100);
};

export const getMockHabits = (): Habit[] => [
  {
    id: '1',
    name: 'Morning Meditation',
    category: 'Mindfulness',
    color: '#8b5cf6', // Violet-500
    icon: 'brain',
    createdAt: new Date().toISOString(),
    logs: {},
    archived: false,
  },
  {
    id: '2',
    name: 'Read 30 Minutes',
    category: 'Personal Growth',
    color: '#6366f1', // Indigo-500
    icon: 'book',
    createdAt: new Date().toISOString(),
    logs: {},
    archived: false,
  },
  {
    id: '3',
    name: 'Workout',
    category: 'Health',
    color: '#10b981', // Emerald-500
    icon: 'dumbbell',
    createdAt: new Date().toISOString(),
    logs: {},
    archived: false,
  },
  {
    id: '4',
    name: 'Drink 2L Water',
    category: 'Health',
    color: '#0ea5e9', // Sky-500
    icon: 'water',
    createdAt: new Date().toISOString(),
    logs: {},
    archived: false,
  }
];