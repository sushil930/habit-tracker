import React, { useMemo } from 'react';
import { format, isSameDay, startOfDay, isAfter, getDay, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Habit, TimeRange } from '../types';
import { Check, Flame, Trash2, Sparkles, Archive } from 'lucide-react';
import { calculateStreak } from '../services/habitService';
import { HabitIcon } from './HabitIcon';
import { FireAnimation } from './FireAnimation';

interface HabitGridProps {
  habits: Habit[];
  dates: Date[];
  onToggle: (habitId: string, date: Date) => void;
  onDelete: (habitId: string) => void;
  onArchive: (habitId: string) => void;
  timeRange: TimeRange;
}

export const HabitGrid: React.FC<HabitGridProps> = ({ habits, dates, onToggle, onDelete, onArchive, timeRange }) => {
  const today = startOfDay(new Date());

  // Sort habits by category (so colors are grouped) then by name
  // Filter out archived habits
  const sortedHabits = useMemo(() => {
    return habits
      .filter(h => !h.archived)
      .sort((a, b) => {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        return a.name.localeCompare(b.name);
      });
  }, [habits]);

  // Helper to determine if color is a tailwind class or hex
  const getColorProps = (color: string) => {
    const isTailwind = color.startsWith('bg-');
    return { isTailwind, color };
  };

  // Helper to render the streak cell with milestone styling
  const renderStreakCell = (streak: number) => {
    let textClass = "font-semibold text-slate-700 dark:text-slate-300";
    let iconClass = "w-4 h-4 text-slate-300 dark:text-slate-600";
    
    // Default Active
    if (streak > 0) {
      iconClass = "w-4 h-4 text-orange-500 fill-orange-500";
    }

    // Milestones styling
    if (streak >= 100) {
      // 100+ Days: Legendary (Gradient + Large + Glow)
      textClass = "text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-indigo-600 drop-shadow-sm";
      iconClass = "w-5 h-5 text-indigo-500 fill-amber-500 animate-pulse drop-shadow-md";
    } else if (streak >= 30) {
      // 30+ Days: Master (Larger + Glow)
      textClass = "text-base font-extrabold text-orange-600 dark:text-orange-500 drop-shadow-[0_2px_4px_rgba(249,115,22,0.2)]";
      iconClass = "w-5 h-5 text-orange-500 fill-orange-500 animate-pulse";
    } else if (streak >= 7) {
      // 7+ Days: Consistent (Bold)
      textClass = "font-bold text-orange-600 dark:text-orange-500";
      iconClass = "w-4 h-4 text-orange-500 fill-orange-500";
    }

    return (
      <div className="flex items-center justify-center gap-1 transition-all duration-300 group/streak" title={`${streak} day streak`}>
        {streak > 0 ? (
          <FireAnimation className={`${iconClass.includes('w-5') ? 'w-5 h-5' : 'w-4 h-4'}`} />
        ) : (
          <Flame className={`${iconClass} transition-all duration-500`} />
        )}
        <span className={textClass}>{streak}</span>
      </div>
    );
  };

  // Helper to calculate weekly stats
  const getWeeklyStats = (habit: Habit, weekStart: Date) => {
    const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));
    const completed = weekDates.filter(d => habit.logs[d]).length;
    return { completed, rate: Math.round((completed / 7) * 100) };
  };

  // Helper to calculate target progress
  const getTargetProgress = (habit: Habit, dateInPeriod: Date) => {
    const freq = habit.frequency || { type: 'daily', goal: 1 };
    
    if (freq.type === 'daily') {
      // For daily, we treat it as 7 days/week in the week view
      const start = startOfWeek(dateInPeriod, { weekStartsOn: 1 }); // Assuming Monday start for consistency
      const end = addDays(start, 6);
      const days = eachDayOfInterval({ start, end });
      const completed = days.filter(d => habit.logs[format(d, 'yyyy-MM-dd')]).length;
      return { current: completed, target: 7, label: 'Weekly' };
    }
    
    if (freq.type === 'weekly') {
      const start = startOfWeek(dateInPeriod, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      const days = eachDayOfInterval({ start, end });
      const completed = days.filter(d => habit.logs[format(d, 'yyyy-MM-dd')]).length;
      return { current: completed, target: freq.goal, label: 'Weekly' };
    }
    
    if (freq.type === 'monthly') {
      const start = startOfMonth(dateInPeriod);
      const end = endOfMonth(dateInPeriod);
      const days = eachDayOfInterval({ start, end });
      const completed = days.filter(d => habit.logs[format(d, 'yyyy-MM-dd')]).length;
      return { current: completed, target: freq.goal, label: 'Monthly' };
    }
    
    return { current: 0, target: 0, label: '' };
  };

  // Determine if we should use the heatmap view (compact) or the table view (checkboxes)
  // We use heatmap for 'year' OR custom ranges longer than 31 days
  const useHeatmap = timeRange === 'year' || (timeRange === 'custom' && dates.length > 31);
  
  // Calculate padding for CSS Grid Heatmap to align days correctly
  // CSS Grid 'grid-auto-flow: column' fills top-down, left-right.
  // We need to ensure the first date starts at the correct row (Sunday = 1, Monday = 2, etc.)
  const heatmapPadding = useMemo(() => {
    if (!useHeatmap || dates.length === 0) return 0;
    const startDay = getDay(dates[0]); // 0 (Sun) to 6 (Sat)
    return startDay;
  }, [dates, useHeatmap]);

  if (habits.filter(h => !h.archived).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
        <div className="relative mb-8 group">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full transform scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          {/* Main Icon Circle */}
          <div className="relative bg-white dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center shadow-xl shadow-indigo-100 dark:shadow-none border border-indigo-50 dark:border-slate-700">
            <FireAnimation className="w-12 h-12" />
          </div>

          {/* Floating Badge */}
          <div className="absolute -right-3 -top-2 animate-bounce duration-[2000ms]">
             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center border-[3px] border-white dark:border-slate-800 shadow-sm">
                 <Sparkles className="w-5 h-5 text-white" />
             </div>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Ignite Your Potential</h3>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm leading-relaxed">
          {habits.length > 0 
            ? "All your habits are archived. Create a new one or restore old ones from settings." 
            : "Consistency is the key to success. Create your first habit to start building your streak and tracking your growth."}
        </p>
      </div>
    );
  }

  // --- Render Heatmap View (Year or Long Custom) ---
  if (useHeatmap) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 w-48 font-medium text-slate-500 dark:text-slate-400 text-sm sticky left-0 bg-slate-50 dark:bg-slate-950 z-10">Habit</th>
                <th className="p-4 text-center font-medium text-slate-500 dark:text-slate-400 text-sm">
                    {timeRange === 'year' ? 'Yearly Activity' : 'Activity Overview'}
                </th>
                <th className="p-4 w-24 text-center font-medium text-slate-500 dark:text-slate-400 text-sm">Streak</th>
                <th className="p-4 w-20 text-center font-medium text-slate-500 dark:text-slate-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedHabits.map((habit) => {
                const streak = calculateStreak(habit);
                const { isTailwind, color } = getColorProps(habit.color);

                return (
                  <tr key={habit.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/50 transition-colors z-10 align-top">
                      <div className="flex items-center gap-3">
                         <div 
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isTailwind ? color.replace('bg-', 'text-').replace('500', '600') + ' bg-opacity-10' : ''}`}
                          style={!isTailwind ? { backgroundColor: color + '20', color: color } : {}}
                        >
                          <HabitIcon iconName={habit.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-200">{habit.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{habit.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {/* GitHub Style CSS Grid Heatmap */}
                      <div 
                        className="grid grid-rows-7 grid-flow-col gap-1 w-max"
                        style={{ height: '88px' }} // 7 rows * (10px height + 2px gap approx)
                      >
                        {/* Padding Items for start alignment */}
                        {Array.from({ length: heatmapPadding }).map((_, i) => (
                           <div key={`pad-${i}`} className="w-2.5 h-2.5" />
                        ))}

                        {dates.map((date, i) => {
                           const dateStr = format(date, 'yyyy-MM-dd');
                           const isCompleted = !!habit.logs[dateStr];
                           const isFuture = isAfter(date, today);
                           
                           return (
                             <button
                               key={dateStr}
                               type="button"
                               onClick={() => !isFuture && onToggle(habit.id, date)}
                               disabled={isFuture}
                               className={`w-2.5 h-2.5 rounded-[1px] transition-all relative ${
                                 isCompleted && isTailwind ? color : ''
                               } ${
                                 !isFuture 
                                    ? 'cursor-pointer hover:scale-150 hover:z-20 hover:shadow-sm hover:brightness-95' 
                                    : 'cursor-not-allowed opacity-40'
                               }`}
                               style={{
                                 backgroundColor: isCompleted 
                                  ? (isTailwind ? undefined : color) 
                                  : (isFuture ? (document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc') : (document.documentElement.classList.contains('dark') ? '#1e293b' : '#e2e8f0')), // Future vs Empty
                                 opacity: isCompleted ? 0.9 : 1
                               }}
                               title={`${format(date, 'MMM d, yyyy')}${isCompleted ? ': Completed' : ''}`}
                             />
                           );
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-center align-top pt-8">
                      {renderStreakCell(streak)}
                    </td>
                    <td className="p-4 text-center align-top pt-8">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={() => onArchive(habit.id)}
                          className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="Archive habit"
                        >
                          <Archive size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(habit.id)}
                          className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete habit"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Each day column = circle (30px) + margin (3px × 2) = 36px
  const CELL_W = 36;
  // Left section fixed width (icon-box 54px + name area) — matches card flex-1 min-w
  const LEFT_W = 220;
  // Center stats fixed width — matches card center section
  const STATS_W = 176;

  // --- Render Week & Month View (Glassmorphism Card Rows) ---
  return (
    <div className="space-y-4" data-purpose="habit-list">

      {/* Day-of-week column headers (week view only) */}
      {timeRange === 'week' && (
        <div className="flex items-center" style={{ paddingLeft: 16, paddingRight: 16 }}>
          {/* Spacer: mirrors card left section */}
          <div className="flex-1" />
          {/* Spacer: mirrors card center stats */}
          <div className="hidden sm:block" style={{ width: STATS_W, flexShrink: 0 }} />
          {/* Day labels — separator to mirror card's border-l + pl-4 */}
          <div className="flex items-center" style={{ paddingLeft: 17 }}>
            {dates.map((date) => {
              const isToday = isSameDay(date, today);
              return (
                <div
                  key={date.toString()}
                  className="flex flex-col items-center"
                  style={{ width: CELL_W, flexShrink: 0 }}
                >
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {format(date, 'EEE')}
                  </span>
                  <span className={`text-xs font-semibold mt-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {format(date, 'd')}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Spacer: mirrors hover-action buttons (opacity-0 but always take space) */}
          {/* 2 × (p-1.5=12px + icon-15px) + gap-1=4px + ml-2=8px = 66px */}
          <div style={{ width: 66, flexShrink: 0 }} />
        </div>
      )}

      {sortedHabits.map((habit) => {
        const streak = calculateStreak(habit);
        const { isTailwind, color } = getColorProps(habit.color);

        // Compute target progress (week view)  
        const progress = timeRange === 'week' && dates.length > 0
          ? getTargetProgress(habit, dates[0])
          : null;
        const progressPercent = progress
          ? Math.min(100, Math.round((progress.current / progress.target) * 100))
          : 0;
        const isMet = progress ? progress.current >= progress.target : false;

        return (
          <div key={habit.id} className="glass-panel rounded-2xl p-4 flex items-center group">

            {/* Left: Icon + Name + Progress */}
            <div className="flex items-center flex-1 min-w-0">
              <div
                className="icon-box"
                style={!isTailwind ? { backgroundColor: color + '22', color } : {}}
              >
                <HabitIcon
                  iconName={habit.icon}
                  className={`w-5 h-5 ${isTailwind ? color.replace('bg-', 'text-').replace('500', '600') : ''}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-slate-800 dark:text-slate-100 font-semibold truncate">
                  {habit.name}
                </h3>
                {timeRange === 'week' && progress && (
                  <div className="progress-base">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isMet ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Center: Weekly badge + Streak (week view) */}
            {timeRange === 'week' && progress && (
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0" style={{ width: STATS_W }}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${
                  isMet
                    ? 'bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-100/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400'
                }`}>
                  <Check className="w-3 h-3" strokeWidth={3} />
                  {progress.current}/{progress.target} {progress.label.toUpperCase()}
                </div>
                {renderStreakCell(streak)}
              </div>
            )}

            {/* Month view: just the streak */}
            {timeRange === 'month' && (
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                {renderStreakCell(streak)}
              </div>
            )}

            {/* Right: Day status circles — pl-4 + 1px border = 17px separator, mirrors header */}
            <div className="flex items-center flex-shrink-0" style={{ borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: 16 }}>
              {dates.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isCompleted = !!habit.logs[dateStr];
                const isFuture = isAfter(date, today);

                let circleClass = 'status-circle';
                if (isFuture) {
                  circleClass += ' future-circle';
                } else if (isCompleted) {
                  circleClass += ' done-green';
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isFuture}
                    onClick={() => !isFuture && onToggle(habit.id, date)}
                    className={circleClass}
                    title={`${format(date, 'EEE MMM d')}${isCompleted ? ' ✓' : ''}`}
                  >
                    {isCompleted && (
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hover actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
              <button
                onClick={() => onArchive(habit.id)}
                className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                title="Archive habit"
              >
                <Archive size={15} />
              </button>
              <button
                onClick={() => onDelete(habit.id)}
                className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete habit"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};