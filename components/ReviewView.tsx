import React, { useState, useEffect, useMemo } from 'react';
import { Habit, ReviewItem, ReviewDecision } from '../types';
import { generateReviewSummary, saveReview, getPreviousMonthPeriod } from '../services/reviewService';
import { ArrowRight, Check, X, Edit2, Archive, Trophy, TrendingDown, Target, Calendar } from 'lucide-react';
import { Button } from './ui/Button';
import { HabitIcon } from './HabitIcon';
import { HabitForm } from './HabitForm';

interface ReviewViewProps {
  habits: Habit[];
  onClose: () => void;
  onUpdateHabit: (id: string, updates: Partial<Habit>) => void;
  onArchiveHabit: (id: string) => void;
}

type Step = 'intro' | 'summary' | 'review' | 'complete';

export const ReviewView: React.FC<ReviewViewProps> = ({ habits, onClose, onUpdateHabit, onArchiveHabit }) => {
  const [step, setStep] = useState<Step>('intro');
  const [currentHabitIndex, setCurrentHabitIndex] = useState(0);
  const [decisions, setDecisions] = useState<ReviewItem[]>([]);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const summary = useMemo(() => generateReviewSummary(habits), [habits]);
  
  // Filter habits that were active last month for the review loop
  const reviewableHabits = useMemo(() => {
    // In a real app, we'd filter by creation date vs review period
    // For now, review all active habits
    return habits.filter(h => !h.archived);
  }, [habits]);

  const currentHabit = reviewableHabits[currentHabitIndex];

  const handleDecision = (decision: ReviewDecision) => {
    const item: ReviewItem = {
      habitId: currentHabit.id,
      decision,
    };
    
    setDecisions(prev => [...prev, item]);

    if (decision === 'drop') {
      onArchiveHabit(currentHabit.id);
    } else if (decision === 'modify') {
      setEditingHabit(currentHabit);
      return; // Pause advancement until edit is done
    }

    advance();
  };

  const handleEditComplete = (name: string, category: string, color: string, icon: string, frequency: any, reminderTime?: string) => {
    if (editingHabit) {
      onUpdateHabit(editingHabit.id, { name, category, color, icon, frequency, reminderTime });
      setEditingHabit(null);
      advance();
    }
  };

  const advance = () => {
    if (currentHabitIndex < reviewableHabits.length - 1) {
      setCurrentHabitIndex(prev => prev + 1);
    } else {
      finishReview();
    }
  };

  const finishReview = () => {
    saveReview({
      id: crypto.randomUUID(),
      period: getPreviousMonthPeriod(),
      completedAt: new Date().toISOString(),
      items: decisions
    });
    setStep('complete');
  };

  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto pt-12 px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Monthly Reflection</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
          It's time to review {summary.periodLabel}. Let's look at what went well, what didn't, and adjust your goals for the month ahead.
        </p>
        <Button onClick={() => setStep('summary')} size="lg" className="w-full sm:w-auto">
          Start Review <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    );
  }

  if (step === 'summary') {
    return (
      <div className="max-w-4xl mx-auto pt-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Month in Review</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Best Habit */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg">
                <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Top Performer</h3>
            </div>
            {summary.bestHabit ? (
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{summary.bestHabit.name}</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">Most consistent habit</p>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">No data yet</p>
            )}
          </div>

          {/* Missed Targets */}
          <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-100 dark:border-amber-800/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                <Target className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">Missed Targets</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.missedTargets.length}</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Habits below goal</p>
          </div>

          {/* Declining */}
          <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-xl border border-rose-100 dark:border-rose-800/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 dark:bg-rose-800 rounded-lg">
                <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="font-semibold text-rose-900 dark:text-rose-200">Needs Focus</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.decliningHabits.length}</p>
            <p className="text-sm text-rose-700 dark:text-rose-400 mt-1">Habits with low activity</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setStep('review')} size="lg">
            Review Habits <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    if (!currentHabit) return null; // Should not happen

    return (
      <div className="max-w-2xl mx-auto pt-12 px-4 animate-in fade-in slide-in-from-right-8 duration-300">
        <div className="text-center mb-8">
          <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Habit {currentHabitIndex + 1} of {reviewableHabits.length}
          </span>
          <div className="mt-4 flex justify-center">
             <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: currentHabit.color + '20', color: currentHabit.color }}
            >
              <HabitIcon iconName={currentHabit.icon} className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-4">{currentHabit.name}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Goal: {currentHabit.frequency
              ? (currentHabit.frequency.type === 'daily'
                  ? 'Daily'
                  : `${currentHabit.frequency.goal} times/${currentHabit.frequency.type}`)
              : 'N/A'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => handleDecision('keep')}
            className="p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800 flex items-center justify-center mb-3 transition-colors">
              <Check className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Keep</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">It's working well. No changes needed.</p>
          </button>

          <button
            onClick={() => handleDecision('modify')}
            className="p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800 flex items-center justify-center mb-3 transition-colors">
              <Edit2 className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Modify</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Adjust the goal, frequency, or details.</p>
          </button>

          <button
            onClick={() => handleDecision('drop')}
            className="p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-rose-100 dark:group-hover:bg-rose-800 flex items-center justify-center mb-3 transition-colors">
              <Archive className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Drop</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Archive this habit for now.</p>
          </button>
        </div>

        {editingHabit && (
          <HabitForm
            existingHabits={habits}
            onSave={handleEditComplete}
            onCancel={() => setEditingHabit(null)}
            initialData={editingHabit}
          />
        )}
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto pt-20 px-4 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-12 h-12 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Review Complete!</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
          Your decisions have been saved. Here's to a productive month ahead!
        </p>
        <Button onClick={onClose} size="lg">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return null;
};
