import React, { useState, useEffect, useMemo } from 'react';
import { Habit, ReviewItem, ReviewDecision } from '../types';
import { generateReviewSummary, saveReview, getPreviousMonthPeriod } from '../services/reviewService';
import { ArrowRight, Check, X, Edit2, Archive, Trophy, TrendingDown, Target, Calendar, Plus } from 'lucide-react';
import { Button } from './ui/Button';
import { HabitIcon } from './HabitIcon';
import { HabitForm } from './HabitForm';
import { EmptyState } from './EmptyState';

interface ReviewViewProps {
  habits: Habit[];
  onClose: () => void;
  onUpdateHabit: (id: string, updates: Partial<Habit>) => void;
  onArchiveHabit: (id: string) => void;
  onAddHabit?: () => void;
}

type Step = 'intro' | 'summary' | 'review' | 'complete';

export const ReviewView: React.FC<ReviewViewProps> = ({ habits, onClose, onUpdateHabit, onArchiveHabit, onAddHabit }) => {
  const [step, setStep] = useState<Step>('intro');
  const [currentHabitIndex, setCurrentHabitIndex] = useState(0);
  const [decisions, setDecisions] = useState<ReviewItem[]>([]);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const summary = useMemo(() => generateReviewSummary(habits), [habits]);
  
  const reviewableHabits = useMemo(() => {
    return habits.filter(h => !h.archived);
  }, [habits]);

  // Empty state check
  if (reviewableHabits.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No Habits to Review"
        description="Create and track some habits first, then come back here for your monthly reflection and adjustment session."
        action={onAddHabit ? {
          label: "Create Your First Habit",
          onClick: () => {
            onClose();
            onAddHabit();
          }
        } : undefined}
        secondaryAction={{
          label: "Back to Dashboard",
          onClick: onClose
        }}
      />
    );
  }

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
      return;
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
        <div className="w-20 h-20 rounded bg-[rgba(240,240,250,0.04)] border border-[rgba(240,240,250,0.08)] flex items-center justify-center mx-auto mb-8">
          <Calendar className="w-9 h-9 text-spectral/30" />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-stencil text-spectral mb-4">Monthly Reflection</h1>
        <p className="text-xs text-spectral/40 uppercase tracking-nav mb-8 max-w-md mx-auto leading-relaxed">
          It's time to review {summary.periodLabel}. Let's look at what went well, what didn't, and adjust your goals for the month ahead.
        </p>
        <Button onClick={() => setStep('summary')} size="lg" className="w-full sm:w-auto">
          Start Review <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (step === 'summary') {
    return (
      <div className="max-w-4xl mx-auto pt-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-sm font-bold uppercase tracking-nav text-spectral mb-8">Month in Review</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Best Habit */}
          <div className="ghost-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[rgba(240,240,250,0.06)] rounded">
                <Trophy className="w-5 h-5 text-spectral/40" />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-nav text-spectral/50">Top Performer</h3>
            </div>
            {summary.bestHabit ? (
              <div>
                <p className="text-lg font-bold text-spectral">{summary.bestHabit.name}</p>
                <p className="text-[10px] text-spectral/30 uppercase tracking-micro mt-1">Most consistent habit</p>
              </div>
            ) : (
              <p className="text-spectral/30 text-xs">No data yet</p>
            )}
          </div>

          {/* Missed Targets */}
          <div className="ghost-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[rgba(240,240,250,0.06)] rounded">
                <Target className="w-5 h-5 text-spectral/40" />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-nav text-spectral/50">Missed Targets</h3>
            </div>
            <p className="text-3xl font-light text-spectral">{summary.missedTargets.length}</p>
            <p className="text-[10px] text-spectral/30 uppercase tracking-micro mt-1">Habits below goal</p>
          </div>

          {/* Declining */}
          <div className="ghost-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[rgba(240,240,250,0.06)] rounded">
                <TrendingDown className="w-5 h-5 text-spectral/40" />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-nav text-spectral/50">Needs Focus</h3>
            </div>
            <p className="text-3xl font-light text-spectral">{summary.decliningHabits.length}</p>
            <p className="text-[10px] text-spectral/30 uppercase tracking-micro mt-1">Habits with low activity</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setStep('review')} size="lg">
            Review Habits <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    if (!currentHabit) return null;

    return (
      <div className="max-w-2xl mx-auto pt-12 px-4 animate-in fade-in slide-in-from-right-8 duration-300">
        <div className="text-center mb-8">
          <span className="text-[10px] font-bold text-spectral/30 uppercase tracking-nav">
            Habit {currentHabitIndex + 1} of {reviewableHabits.length}
          </span>
          <div className="mt-4 flex justify-center">
             <div 
              className="w-16 h-16 rounded flex items-center justify-center border border-[rgba(240,240,250,0.10)] bg-[rgba(240,240,250,0.04)]"
              style={{ color: currentHabit.color }}
            >
              <HabitIcon iconName={currentHabit.icon} className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-stencil text-spectral mt-4">{currentHabit.name}</h2>
          <p className="text-[10px] text-spectral/30 uppercase tracking-micro mt-2">
            Goal: {currentHabit.frequency
              ? (currentHabit.frequency.type === 'daily'
                  ? 'Daily'
                  : `${currentHabit.frequency.goal} times/${currentHabit.frequency.type}`)
              : 'N/A'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleDecision('keep')}
            className="ghost-panel p-6 hover:bg-[rgba(240,240,250,0.08)] hover:border-[rgba(240,240,250,0.25)] transition-all group text-left"
          >
            <div className="w-10 h-10 rounded bg-[rgba(240,240,250,0.04)] group-hover:bg-[rgba(240,240,250,0.10)] flex items-center justify-center mb-3 transition-colors">
              <Check className="w-5 h-5 text-spectral/30 group-hover:text-spectral" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Keep</h3>
            <p className="text-[10px] text-spectral/30 mt-1 uppercase tracking-micro">It's working well. No changes needed.</p>
          </button>

          <button
            onClick={() => handleDecision('modify')}
            className="ghost-panel p-6 hover:bg-[rgba(240,240,250,0.08)] hover:border-[rgba(240,240,250,0.25)] transition-all group text-left"
          >
            <div className="w-10 h-10 rounded bg-[rgba(240,240,250,0.04)] group-hover:bg-[rgba(240,240,250,0.10)] flex items-center justify-center mb-3 transition-colors">
              <Edit2 className="w-5 h-5 text-spectral/30 group-hover:text-spectral" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Modify</h3>
            <p className="text-[10px] text-spectral/30 mt-1 uppercase tracking-micro">Adjust the goal, frequency, or details.</p>
          </button>

          <button
            onClick={() => handleDecision('drop')}
            className="ghost-panel p-6 hover:bg-[rgba(240,240,250,0.08)] hover:border-[rgba(240,240,250,0.25)] transition-all group text-left"
          >
            <div className="w-10 h-10 rounded bg-[rgba(240,240,250,0.04)] group-hover:bg-[rgba(240,240,250,0.10)] flex items-center justify-center mb-3 transition-colors">
              <Archive className="w-5 h-5 text-spectral/30 group-hover:text-spectral" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Drop</h3>
            <p className="text-[10px] text-spectral/30 mt-1 uppercase tracking-micro">Archive this habit for now.</p>
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
        <div className="w-24 h-24 rounded bg-[rgba(240,240,250,0.04)] border border-[rgba(240,240,250,0.12)] flex items-center justify-center mx-auto mb-8">
          <Check className="w-10 h-10 text-spectral/50" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-stencil text-spectral mb-4">Review Complete</h1>
        <p className="text-xs text-spectral/40 uppercase tracking-nav mb-8 max-w-sm mx-auto leading-relaxed">
          Your decisions have been saved. Here's to a productive month ahead.
        </p>
        <Button onClick={onClose} size="lg">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return null;
};
