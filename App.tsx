import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  BarChart2, 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  CalendarRange,
} from 'lucide-react';
import { 
  startOfWeek, 
  addDays, 
  format, 
  addWeeks, 
  subWeeks, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  startOfYear,
  endOfYear,
  addYears,
  subYears,
  differenceInDays,
  isValid,
  parseISO
} from 'date-fns';

import { Habit, ViewMode, TimeRange, HabitFrequency } from './types';
import { 
  loadHabits, 
  saveHabits, 
  getMockHabits, 
  clearAllData, 
  validateBackup,
  calculateStreak,
  hasCompletedOnboarding,
  setOnboardingCompleted
} from './services/habitService';
import { useDesktopNotificationScheduler } from './services/desktopNotificationScheduler';
import { sendHabitNotification } from './services/notificationService';
import { HabitGrid } from './components/HabitGrid';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { HabitForm } from './components/HabitForm';
import { Button } from './components/ui/Button';
import { ConfirmationModal } from './components/ui/ConfirmationModal';
import { OnboardingTour } from './components/OnboardingTour';
import { ReviewView } from './components/ReviewView';
import { isReviewDue } from './services/reviewService';
import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const App: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Custom range state (defaults to current month)
  const [customStart, setCustomStart] = useState<Date>(startOfMonth(new Date()));
  const [customEnd, setCustomEnd] = useState<Date>(endOfMonth(new Date()));

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [showReviewBanner, setShowReviewBanner] = useState(false);

  const hasMonthOfUsage = useMemo(() => {
    if (!habits.length) return false;
    const earliest = habits.reduce<Date | null>((acc, h) => {
      const created = parseISO(h.createdAt);
      if (!isValid(created)) return acc;
      if (!acc) return created;
      return created < acc ? created : acc;
    }, null);
    if (!earliest) return false;
    return differenceInDays(new Date(), earliest) >= 30;
  }, [habits]);

  // Force dark mode always — SpaceX is the void
  useEffect(() => {
    document.documentElement.classList.add('dark');
    try {
      localStorage.setItem('habitflow_theme', 'dark');
    } catch {
      // ignore
    }
  }, []);

  // Check for monthly review
  useEffect(() => {
    if (isReviewDue() && hasMonthOfUsage) {
      setShowReviewBanner(true);
    } else {
      setShowReviewBanner(false);
    }
  }, [hasMonthOfUsage]);

  // Keyboard navigation for week view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'dashboard' || timeRange !== 'week') return;
      
      // Ignore if modal or form is open (simple check)
      if (isFormOpen || habitToDelete) return;

      if (e.key === 'ArrowLeft') {
        setCurrentDate(prev => subWeeks(prev, 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentDate(prev => addWeeks(prev, 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, timeRange, isFormOpen, habitToDelete]);

  // Load data on mount
  useEffect(() => {
    const data = loadHabits();
    if (data.length === 0) {
      // First time user experience
      setHabits(getMockHabits());
    } else {
      setHabits(data);
    }

    // Check onboarding status
    if (!hasCompletedOnboarding()) {
      // Small delay to ensure UI is ready
      setTimeout(() => setShowTour(true), 500);
    }

    setIsLoading(false);
  }, []);

  // Tray: "Add Habit" -> open modal
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | null = null;
    void (async () => {
      unlisten = await listen('tray:add-habit', () => {
        setViewMode('dashboard');
        setIsFormOpen(true);
      });
    })();
    return () => {
      try {
        unlisten?.();
      } catch {
        // ignore
      }
    };
  }, []);

  // Desktop-only: scheduler while app is running (reminders + missed alerts)
  useDesktopNotificationScheduler(habits);

  // Persistence
  useEffect(() => {
    if (!isLoading) {
      saveHabits(habits);
    }
  }, [habits, isLoading]);

  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  const datesToDisplay = useMemo(() => {
    if (timeRange === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else if (timeRange === 'month') {
      return eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      });
    } else if (timeRange === 'year') {
      return eachDayOfInterval({
        start: startOfYear(currentDate),
        end: endOfYear(currentDate)
      });
    } else {
      // Custom Range
      const start = customStart > customEnd ? customEnd : customStart;
      const end = customEnd < customStart ? customStart : customEnd;
      
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, timeRange, customStart, customEnd]);

  const handleToggleHabit = (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    let updatedHabit: Habit | null = null;
    let completionAdded = false;

    setHabits(prev =>
      prev.map(h => {
        if (h.id !== habitId) return h;
        const newLogs = { ...h.logs };
        if (newLogs[dateStr]) {
          delete newLogs[dateStr];
          completionAdded = false;
        } else {
          newLogs[dateStr] = true;
          completionAdded = true;
        }
        updatedHabit = { ...h, logs: newLogs };
        return updatedHabit;
      })
    );

    // Desktop-only: streak milestone notifications (only when marking TODAY as done)
    if (completionAdded && dateStr === todayStr && updatedHabit) {
      const streak = calculateStreak(updatedHabit);
      const milestones = [7, 14, 30, 50, 100];
      if (milestones.includes(streak)) {
        const key = `habitflow_streak_milestone_v1:${updatedHabit.id}`;
        try {
          const last = Number(localStorage.getItem(key) || '0');
          if (last !== streak) {
            localStorage.setItem(key, String(streak));
            void sendHabitNotification('Streak milestone', `${updatedHabit.name}: ${streak} day streak!`);
          }
        } catch {
          void sendHabitNotification('Streak milestone', `${updatedHabit.name}: ${streak} day streak!`);
        }
      }
    }
  };

  const handleAddHabit = (name: string, category: string, color: string, icon: string, frequency: HabitFrequency, reminderTime?: string) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      category,
      color,
      icon,
      frequency,
      reminderTime,
      createdAt: new Date().toISOString(),
      logs: {},
      archived: false,
    };
    setHabits([...habits, newHabit]);
    setIsFormOpen(false);
  };

  const handleUpdateHabit = (id: string, updates: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleDeleteHabit = (id: string) => {
    setHabitToDelete(id);
  };

  const handleArchiveHabit = (id: string) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, archived: true } : h));
  };

  const handleRestoreHabit = (id: string) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, archived: false } : h));
  };

  const confirmDeleteHabit = () => {
    if (habitToDelete) {
      setHabits(prev => prev.filter(h => h.id !== habitToDelete));
      setHabitToDelete(null);
    }
  };

  const handleClearData = () => {
    if (window.confirm('Are you absolutely sure you want to delete all data? This action cannot be undone.')) {
      clearAllData();
      setHabits([]);
      setViewMode('dashboard');
    }
  };

  const handleImportData = (data: any) => {
    if (validateBackup(data)) {
      if (window.confirm('This will replace your current data with the backup. Are you sure you want to continue?')) {
        setHabits(data);
        alert('Backup restored successfully!');
      }
    } else {
      alert('Invalid backup file format. Please upload a valid JSON file exported from HabitFlow.');
    }
  };

  const handleCompleteTour = () => {
    setShowTour(false);
    setOnboardingCompleted();
  };

  const handlePrev = () => {
    if (timeRange === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (timeRange === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (timeRange === 'year') setCurrentDate(subYears(currentDate, 1));
    else {
        // Custom: shift back by the duration of the range
        const days = differenceInDays(customEnd, customStart) + 1;
        setCustomStart(prev => addDays(prev, -days));
        setCustomEnd(prev => addDays(prev, -days));
    }
  };

  const handleNext = () => {
    if (timeRange === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (timeRange === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (timeRange === 'year') setCurrentDate(addYears(currentDate, 1));
    else {
        // Custom: shift forward by the duration of the range
        const days = differenceInDays(customEnd, customStart) + 1;
        setCustomStart(prev => addDays(prev, days));
        setCustomEnd(prev => addDays(prev, days));
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', dateStr: string) => {
    const date = parseISO(dateStr);
    if (!isValid(date)) return;

    if (type === 'start') {
        setCustomStart(date);
        // Prevent end before start
        if (date > customEnd) setCustomEnd(date);
    } else {
        setCustomEnd(date);
        // Prevent start after end
        if (date < customStart) setCustomStart(date);
    }
  };

  const dateLabel = useMemo(() => {
    if (timeRange === 'week') {
      return `${format(datesToDisplay[0], 'MMM d')} - ${format(datesToDisplay[6], 'MMM d, yyyy')}`;
    } else if (timeRange === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (timeRange === 'year') {
      return format(currentDate, 'yyyy');
    } else {
      return `${format(customStart, 'MMM d, yyyy')} - ${format(customEnd, 'MMM d, yyyy')}`;
    }
  }, [datesToDisplay, timeRange, currentDate, customStart, customEnd]);

  return (
    <div className="hf-bg text-spectral font-sans flex flex-col min-h-screen">
      {/* ═══ Navigation ═══ */}
      <nav className="sticky top-0 z-30 ghost-nav">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-spectral opacity-60" />
              <span className="text-sm font-bold uppercase tracking-nav text-spectral">HabitFlow</span>
            </div>

            {/* View Toggles */}
            <div id="view-toggles" className="hidden md:flex items-center ghost-panel p-1 gap-1">
              {(['dashboard', 'analytics', 'settings'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-nav transition-all flex items-center gap-2 ${
                    viewMode === mode
                      ? 'bg-[rgba(240,240,250,0.12)] text-spectral'
                      : 'text-spectral/40 hover:text-spectral/80'
                  }`}
                >
                  {mode === 'dashboard' && <LayoutDashboard size={14} />}
                  {mode === 'analytics' && <BarChart2 size={14} />}
                  {mode === 'settings' && <Settings size={14} />}
                  {mode}
                </button>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <div id="btn-new-habit">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="ghost-btn px-5 py-2 text-xs flex items-center gap-2"
                >
                  <Plus size={14} />
                  New Habit
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ Main Content ═══ */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-10">
        {viewMode === 'dashboard' ? (
          <div className="space-y-8">
            {/* Review Banner */}
            {showReviewBanner && (
              <div className="ghost-panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[rgba(240,240,250,0.06)]">
                    <CalendarIcon className="w-5 h-5 text-spectral opacity-60" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Monthly Review Ready</h3>
                    <p className="text-xs text-spectral/40 uppercase tracking-micro mt-0.5">Reflect on your progress</p>
                  </div>
                </div>
                <Button onClick={() => setViewMode('review')} size="sm">
                  Start Review
                </Button>
              </div>
            )}

            {/* Header Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold uppercase tracking-stencil text-spectral">
                  {timeRange === 'year' ? 'Yearly Overview' : timeRange === 'month' ? 'Monthly Tracker' : timeRange === 'custom' ? 'Custom Range' : 'Weekly Tracker'}
                </h1>
                <p className="text-xs text-spectral/30 uppercase tracking-nav mt-2">
                  {timeRange === 'year'
                    ? 'Visualize your consistency throughout the year.'
                    : 'Track your habits and build consistency.'}
                </p>
              </div>

              {/* Time Controls */}
              <div className="ghost-panel p-1.5 flex items-center gap-2 flex-wrap">
                {/* Range Toggle */}
                <div className="flex bg-[rgba(240,240,250,0.04)] rounded p-0.5">
                  {(['week', 'month', 'year', 'custom'] as TimeRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-nav transition-all ${
                        timeRange === range
                          ? 'bg-[rgba(240,240,250,0.12)] text-spectral'
                          : 'text-spectral/30 hover:text-spectral/60'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>

                <div className="w-px h-5 bg-[rgba(240,240,250,0.10)]" />

                {/* Date Navigator */}
                <div className="flex items-center gap-3 px-1">
                  <button
                    onClick={handlePrev}
                    className="text-spectral/30 hover:text-spectral transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold uppercase tracking-nav text-spectral/60 tabular-nums whitespace-nowrap">
                    {dateLabel}
                  </span>
                  <button
                    onClick={handleNext}
                    className="text-spectral/30 hover:text-spectral transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Custom Date Inputs */}
                {timeRange === 'custom' && (
                  <>
                    <div className="w-px h-5 bg-[rgba(240,240,250,0.10)]" />
                    <div className="flex items-center gap-2 px-1">
                      <CalendarRange size={13} className="text-spectral/30" />
                      <input
                        type="date"
                        value={format(customStart, 'yyyy-MM-dd')}
                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                        className="text-xs font-bold uppercase tracking-nav text-spectral/60 focus:outline-none bg-transparent [color-scheme:dark]"
                      />
                      <span className="text-spectral/20">→</span>
                      <input
                        type="date"
                        value={format(customEnd, 'yyyy-MM-dd')}
                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                        className="text-xs font-bold uppercase tracking-nav text-spectral/60 focus:outline-none bg-transparent [color-scheme:dark]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Grid */}
            <div id="habit-grid-area">
              <HabitGrid 
                habits={habits} 
                dates={datesToDisplay} 
                onToggle={handleToggleHabit} 
                onDelete={handleDeleteHabit}
                onArchive={handleArchiveHabit}
                timeRange={timeRange}
              />
            </div>
          </div>
        ) : viewMode === 'analytics' ? (
          <StatsView habits={habits} darkMode={true} onAddHabit={() => {
            setViewMode('dashboard');
            setIsFormOpen(true);
          }} />
        ) : viewMode === 'review' ? (
          <ReviewView 
            habits={habits} 
            onClose={() => {
              setViewMode('dashboard');
              setShowReviewBanner(false);
            }}
            onUpdateHabit={handleUpdateHabit}
            onArchiveHabit={handleArchiveHabit}
            onAddHabit={() => setIsFormOpen(true)}
          />
        ) : (
          <SettingsView 
            onClearData={handleClearData} 
            onImportData={handleImportData}
            habits={habits}
            onRestore={handleRestoreHabit}
            onDelete={handleDeleteHabit}
          />
        )}
      </main>

      {/* ═══ Footer ═══ */}
      <footer className="w-full text-center py-6">
        <p className="text-[10px] text-spectral/20 uppercase tracking-nav">&copy; {new Date().getFullYear()} HabitFlow. Stay consistent.</p>
      </footer>

      {/* ═══ Modals ═══ */}
      {isFormOpen && (
        <HabitForm 
          onSave={handleAddHabit} 
          onCancel={() => setIsFormOpen(false)} 
          existingHabits={habits}
        />
      )}
      
      <ConfirmationModal
        isOpen={!!habitToDelete}
        onClose={() => setHabitToDelete(null)}
        onConfirm={confirmDeleteHabit}
        title="Delete Habit"
        description="Are you sure you want to delete this habit? All tracking data associated with it will be permanently lost."
        confirmLabel="Delete Habit"
      />

      {/* Onboarding Tour */}
      {showTour && <OnboardingTour onComplete={handleCompleteTour} isFormOpen={isFormOpen} />}
    </div>
  );
};

export default App;