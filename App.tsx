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
  Moon,
  Sun
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

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('habitflow_theme');
        if (saved) return saved === 'dark';
      } catch {
        // ignore (some WebViews can block storage)
      }

      return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    }
    return false;
  });
  // Check for monthly review
  useEffect(() => {
    if (isReviewDue() && hasMonthOfUsage) {
      setShowReviewBanner(true);
    } else {
      setShowReviewBanner(false);
    }
  }, [hasMonthOfUsage]);

  // Apply Dark Mode Class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('habitflow_theme', 'dark');
      } catch {
        // ignore
      }
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('habitflow_theme', 'light');
      } catch {
        // ignore
      }
    }
  }, [darkMode]);

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
      // Ensure start is before end
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
    <div className="hf-bg text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 flex flex-col transition-colors duration-300">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 glass-nav transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shadow-indigo-200">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">HabitFlow</span>
            </div>

            {/* View Toggles */}
            <div id="view-toggles" className="hidden md:flex items-center glass-panel p-1 rounded-2xl gap-1">
              {(['dashboard', 'analytics', 'settings'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all capitalize flex items-center gap-2 ${
                    viewMode === mode
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {mode === 'dashboard' && <LayoutDashboard size={15} />}
                  {mode === 'analytics' && <BarChart2 size={15} />}
                  {mode === 'settings' && <Settings size={15} />}
                  {mode}
                </button>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="glass-button p-2 rounded-xl text-slate-600 dark:text-slate-400"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div id="btn-new-habit">
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2 hover:shadow-sm"
                >
                  <Plus size={16} />
                  New Habit
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-10">
        {viewMode === 'dashboard' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Review Banner */}
            {showReviewBanner && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">Monthly Review Ready</h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">Reflect on your progress and plan for the month ahead.</p>
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
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
                  {timeRange === 'year' ? 'Yearly Overview' : timeRange === 'month' ? 'Monthly Tracker' : timeRange === 'custom' ? 'Custom Range' : 'Weekly Tracker'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  {timeRange === 'year'
                    ? 'Visualize your consistency throughout the year.'
                    : 'Track your habits and build consistency.'}
                </p>
              </div>

              {/* Time Controls */}
              <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-2 flex-wrap">
                {/* Range Toggle */}
                <div className="flex bg-black/5 dark:bg-white/5 rounded-xl p-1">
                  {(['week', 'month', 'year', 'custom'] as TimeRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                        timeRange === range
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>

                <div className="w-px h-5 bg-slate-300 dark:bg-slate-600" />

                {/* Date Navigator */}
                <div className="flex items-center gap-3 px-1">
                  <button
                    onClick={handlePrev}
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap">
                    {dateLabel}
                  </span>
                  <button
                    onClick={handleNext}
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Custom Date Inputs */}
                {timeRange === 'custom' && (
                  <>
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600" />
                    <div className="flex items-center gap-2 px-1">
                      <CalendarRange size={13} className="text-slate-400" />
                      <input
                        type="date"
                        value={format(customStart, 'yyyy-MM-dd')}
                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                        className="text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none bg-transparent dark:[color-scheme:dark]"
                      />
                      <span className="text-slate-400">→</span>
                      <input
                        type="date"
                        value={format(customEnd, 'yyyy-MM-dd')}
                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                        className="text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none bg-transparent dark:[color-scheme:dark]"
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
          <StatsView habits={habits} darkMode={darkMode} onAddHabit={() => {
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

      {/* Footer */}
      <footer className="w-full text-center py-6 text-sm text-slate-400 dark:text-slate-600">
        <p>&copy; {new Date().getFullYear()} HabitFlow. Stay consistent.</p>
      </footer>

      {/* Modals */}
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