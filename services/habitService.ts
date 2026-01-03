import { Habit } from '../types';
import { startOfDay, subDays, isSameDay, format, parseISO, differenceInDays } from 'date-fns';

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
  const yesterday = subDays(today, 1);
  
  const todayStr = format(today, 'yyyy-MM-dd');
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
  
  // If not completed today AND not completed yesterday, streak is broken
  if (!habit.logs[todayStr] && !habit.logs[yesterdayStr]) {
    return 0;
  }
  
  // Start checking from today if completed today, otherwise start from yesterday
  let currentCheckDate = habit.logs[todayStr] ? today : yesterday;

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

export const calculateLongestStreak = (habit: Habit): number => {
  const dates = Object.keys(habit.logs).sort();
  if (dates.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of dates) {
    const currentDate = parseISO(dateStr);
    
    if (!prevDate) {
      currentStreak = 1;
      maxStreak = 1;
    } else {
      const diff = differenceInDays(currentDate, prevDate);
      if (diff === 1) {
        currentStreak++;
      } else if (diff > 1) {
        currentStreak = 1;
      }
      // if diff === 0 (duplicate), ignore
    }
    
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }
    prevDate = currentDate;
  }
  
  return maxStreak;
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