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
  hasCompletedOnboarding,
  setOnboardingCompleted
} from './services/habitService';
import { HabitGrid } from './components/HabitGrid';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { HabitForm } from './components/HabitForm';
import { Button } from './components/ui/Button';
import { ConfirmationModal } from './components/ui/ConfirmationModal';
import { OnboardingTour } from './components/OnboardingTour';
import { ReviewView } from './components/ReviewView';
import { isReviewDue } from './services/reviewService';

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

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('habitflow_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  // Check for monthly review
  useEffect(() => {
    if (isReviewDue()) {
      setShowReviewBanner(true);
    }
  }, []);

  // Apply Dark Mode Class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('habitflow_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('habitflow_theme', 'light');
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
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const newLogs = { ...h.logs };
      if (newLogs[dateStr]) {
        delete newLogs[dateStr];
      } else {
        newLogs[dateStr] = true;
      }
      return { ...h, logs: newLogs };
    }));
  };

  const handleAddHabit = (name: string, category: string, color: string, icon: string, frequency: HabitFrequency) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      category,
      color,
      icon,
      frequency,
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 transition-colors duration-300">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">HabitFlow</span>
            </div>
            
            <div id="view-toggles" className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg transition-colors">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'dashboard' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={16} />
                  Dashboard
                </div>
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'analytics' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart2 size={16} />
                  Analytics
                </div>
              </button>
              <button
                onClick={() => setViewMode('settings')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'settings' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings size={16} />
                  Settings
                </div>
              </button>
            </div>

            <div className="flex items-center gap-4">
               {/* Dark Mode Toggle */}
               <button
                 onClick={() => setDarkMode(!darkMode)}
                 className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                 title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
               >
                 {darkMode ? <Sun size={20} /> : <Moon size={20} />}
               </button>

               <div id="btn-new-habit">
                  <Button onClick={() => setIsFormOpen(true)} size="sm">
                    <Plus size={18} className="mr-1.5" />
                    New Habit
                  </Button>
               </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {timeRange === 'year' ? 'Yearly Overview' : timeRange === 'month' ? 'Monthly Tracker' : timeRange === 'custom' ? 'Custom Range' : 'Weekly Tracker'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  {timeRange === 'year' 
                    ? 'Visualize your consistency throughout the year.' 
                    : 'Track your habits and build consistency.'}
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Range Toggle */}
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                    {(['week', 'month', 'year', 'custom'] as TimeRange[]).map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                          timeRange === range
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>

                  {/* Date Navigator */}
                  <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-1 transition-colors">
                    <button 
                      onClick={handlePrev}
                      className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Previous"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="px-4 font-medium text-slate-700 dark:text-slate-200 tabular-nums min-w-[140px] text-center text-sm">
                      {dateLabel}
                    </span>
                    <button 
                      onClick={handleNext}
                      className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Next"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                {/* Custom Date Inputs */}
                {timeRange === 'custom' && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                     <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                       <CalendarRange size={14} className="text-slate-400" />
                       <input 
                         type="date" 
                         value={format(customStart, 'yyyy-MM-dd')}
                         onChange={(e) => handleCustomDateChange('start', e.target.value)}
                         className="text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded bg-transparent dark:[color-scheme:dark]"
                       />
                       <span className="text-slate-300 mx-1">→</span>
                       <input 
                         type="date" 
                         value={format(customEnd, 'yyyy-MM-dd')}
                         onChange={(e) => handleCustomDateChange('end', e.target.value)}
                         className="text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded bg-transparent dark:[color-scheme:dark]"
                       />
                     </div>
                  </div>
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
          <StatsView habits={habits} darkMode={darkMode} />
        ) : viewMode === 'review' ? (
          <ReviewView 
            habits={habits} 
            onClose={() => {
              setViewMode('dashboard');
              setShowReviewBanner(false);
            }}
            onUpdateHabit={handleUpdateHabit}
            onArchiveHabit={handleArchiveHabit}
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
      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-slate-400 text-sm">
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