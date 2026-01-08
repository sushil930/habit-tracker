import { Habit, MonthlyReview } from '../types';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, startOfWeek, addDays, addWeeks, addMonths } from 'date-fns';

const REVIEW_STORAGE_KEY = 'habitflow_reviews_v1';

export const getReviews = (): MonthlyReview[] => {
  try {
    const saved = localStorage.getItem(REVIEW_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveReview = (review: MonthlyReview) => {
  const reviews = getReviews();
  const existingIndex = reviews.findIndex(r => r.period === review.period);
  if (existingIndex >= 0) {
    reviews[existingIndex] = review;
  } else {
    reviews.unshift(review); // Add to top
  }
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
};

export const getPreviousMonthPeriod = () => {
  return format(subMonths(new Date(), 1), 'yyyy-MM');
};

export const isReviewDue = (): boolean => {
  const period = getPreviousMonthPeriod();
  const reviews = getReviews();
  return !reviews.find(r => r.period === period);
};

export interface ReviewSummary {
  periodLabel: string;
  bestHabit?: Habit;
  decliningHabits: Habit[];
  missedTargets: Habit[];
  totalCompletionRate: number;
}

export const generateReviewSummary = (habits: Habit[]): ReviewSummary => {
  const prevMonthDate = subMonths(new Date(), 1);
  const periodLabel = format(prevMonthDate, 'MMMM yyyy');
  const start = startOfMonth(prevMonthDate);
  const end = endOfMonth(prevMonthDate);
  const daysInMonth = eachDayOfInterval({ start, end });
  
  const activeHabits = habits.filter(h => !h.archived && parseISO(h.createdAt) <= end);

  if (activeHabits.length === 0) {
    return {
      periodLabel,
      decliningHabits: [],
      missedTargets: [],
      totalCompletionRate: 0
    };
  }

  // Calculate stats for each habit
  const habitStats = activeHabits.map(habit => {
    const logsInMonth = daysInMonth.filter(d => habit.logs[format(d, 'yyyy-MM-dd')]).length;
    const rate = logsInMonth / daysInMonth.length;
    
    // Check target
    let targetMet = false;
    const freq = habit.frequency || { type: 'daily', goal: 1 };
    
    if (freq.type === 'daily') {
      // Simple approximation: did they do it > 80% of days?
      targetMet = rate >= 0.8;
    } else if (freq.type === 'weekly') {
      // Check average weekly completion
      const weeks = Math.ceil(daysInMonth.length / 7);
      const avgPerWeek = logsInMonth / weeks;
      targetMet = avgPerWeek >= freq.goal;
    } else if (freq.type === 'monthly') {
      targetMet = logsInMonth >= freq.goal;
    }

    return { habit, rate, targetMet, logsInMonth };
  });

  // Best habit: highest completion rate
  const best = [...habitStats].sort((a, b) => b.rate - a.rate)[0];

  // Declining: rate < 30% (arbitrary threshold for "declining" or "struggling")
  const declining = habitStats.filter(s => s.rate < 0.3).map(s => s.habit);

  // Missed targets
  const missed = habitStats.filter(s => !s.targetMet).map(s => s.habit);

  // Total rate
  const totalRate = habitStats.reduce((acc, s) => acc + s.rate, 0) / habitStats.length;

  return {
    periodLabel,
    bestHabit: best?.habit,
    decliningHabits: declining,
    missedTargets: missed,
    totalCompletionRate: Math.round(totalRate * 100)
  };
};
