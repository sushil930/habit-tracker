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
    let textClass = "font-bold text-spectral/50";
    let showFire = false;
    
    if (streak > 0) {
      showFire = true;
      textClass = "font-bold text-spectral/70";
    }

    if (streak >= 100) {
      textClass = "text-lg font-extrabold text-spectral";
    } else if (streak >= 30) {
      textClass = "text-base font-extrabold text-spectral/90";
    } else if (streak >= 7) {
      textClass = "font-bold text-spectral/80";
    }

    return (
      <div className="flex items-center justify-center gap-1 transition-all duration-300 group/streak" title={`${streak} day streak`}>
        {streak > 0 ? (
          <FireAnimation className={`${streak >= 30 ? 'w-5 h-5' : 'w-4 h-4'}`} />
        ) : (
          <Flame className="w-4 h-4 text-spectral/15 transition-all duration-500" />
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
      const start = startOfWeek(dateInPeriod, { weekStartsOn: 1 });
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
  const useHeatmap = timeRange === 'year';
  
  // Calculate padding for CSS Grid Heatmap
  const heatmapPadding = useMemo(() => {
    if (!useHeatmap || dates.length === 0) return 0;
    const startDay = getDay(dates[0]);
    return startDay;
  }, [dates, useHeatmap]);

  // Heatmap months labels — compute the grid column where each month starts
  const heatmapMonths = useMemo(() => {
    if (!useHeatmap || dates.length === 0) return [];
    const months: { name: string; colIndex: number }[] = [];
    let currentMonth = -1;
    dates.forEach((d, i) => {
      const m = d.getMonth();
      if (m !== currentMonth) {
        // The grid slot for this date = padding cells + date index
        // Column in the grid = Math.floor(gridSlot / 7) since grid-rows-7
        const gridSlot = i + heatmapPadding;
        const colIndex = Math.floor(gridSlot / 7);
        months.push({ name: format(d, 'MMM'), colIndex });
        currentMonth = m;
      }
    });
    return months;
  }, [dates, heatmapPadding, useHeatmap]);

  if (habits.filter(h => !h.archived).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 ghost-panel">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded bg-[rgba(240,240,250,0.04)] border border-[rgba(240,240,250,0.08)] flex items-center justify-center">
            <FireAnimation className="w-12 h-12" />
          </div>
        </div>
        
        <h3 className="text-sm font-bold uppercase tracking-nav text-spectral mb-3">Ignite Your Potential</h3>
        <p className="text-xs text-spectral/30 text-center max-w-sm uppercase tracking-micro leading-relaxed">
          {habits.length > 0 
            ? "All your habits are archived. Create a new one or restore old ones from settings." 
            : "Consistency is the key to success. Create your first habit to start building your streak."}
        </p>
      </div>
    );
  }

  // --- Render Heatmap View (Year or Long Custom) ---
  if (useHeatmap) {
    return (
      <div className="ghost-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(240,240,250,0.06)]">
                <th className="p-4 w-48 text-[10px] font-bold uppercase tracking-nav text-spectral/30 sticky left-0 bg-black z-10">Habit</th>
                <th className="p-4 text-center text-[10px] font-bold uppercase tracking-nav text-spectral/30">
                    {timeRange === 'year' ? 'Yearly Activity' : 'Activity Overview'}
                </th>
                <th className="p-4 w-24 text-center text-[10px] font-bold uppercase tracking-nav text-spectral/30">Streak</th>
                <th className="p-4 w-20 text-center text-[10px] font-bold uppercase tracking-nav text-spectral/30">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(240,240,250,0.04)]">
              {sortedHabits.map((habit) => {
                const streak = calculateStreak(habit);
                const { isTailwind, color } = getColorProps(habit.color);

                return (
                  <tr key={habit.id} className="group hover:bg-[rgba(240,240,250,0.02)] transition-colors">
                    <td className="p-4 sticky left-0 bg-black group-hover:bg-[rgba(240,240,250,0.02)] transition-colors z-10 align-top">
                      <div className="flex items-center gap-3">
                         <div 
                          className="w-9 h-9 rounded flex items-center justify-center shrink-0 bg-[rgba(240,240,250,0.04)] border border-[rgba(240,240,250,0.08)]"
                          style={{ color: color }}
                        >
                          <HabitIcon iconName={habit.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-micro text-spectral">{habit.name}</p>
                          <p className="text-[10px] text-spectral/20 uppercase tracking-micro">{habit.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {/* GitHub Style CSS Grid Heatmap */}
                      <div className="flex flex-col">
                        <div className="flex items-start">
                          {/* Day Labels */}
                          <div className="flex flex-col gap-1 text-[8px] text-spectral/30 uppercase tracking-micro text-right pr-2 shrink-0" style={{ marginTop: '20px' }}>
                            <span className="h-2.5 leading-[10px] opacity-0">Sun</span>
                            <span className="h-2.5 leading-[10px]">Mon</span>
                            <span className="h-2.5 leading-[10px] opacity-0">Tue</span>
                            <span className="h-2.5 leading-[10px]">Wed</span>
                            <span className="h-2.5 leading-[10px] opacity-0">Thu</span>
                            <span className="h-2.5 leading-[10px]">Fri</span>
                            <span className="h-2.5 leading-[10px] opacity-0">Sat</span>
                          </div>
                      
                          <div className="relative flex flex-col">
                            {/* Month Labels — aligned to grid columns */}
                            <div className="relative h-4 mb-1.5 text-[10px] text-spectral/30 uppercase tracking-micro whitespace-nowrap">
                              {heatmapMonths.map((m, i) => (
                                <span key={i} className="absolute inline-block" style={{ left: `${m.colIndex * 14}px` }}>{m.name}</span>
                              ))}
                            </div>

                            <div 
                              className="grid grid-rows-7 grid-flow-col gap-1 w-max relative z-10"
                              style={{ height: '88px' }}
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
                                       !isFuture 
                                          ? 'cursor-pointer hover:scale-150 hover:z-20' 
                                          : 'cursor-not-allowed opacity-20'
                                     }`}
                                     style={{
                                       backgroundColor: isCompleted 
                                        ? '#f0f0fa' 
                                        : (isFuture ? 'rgba(240,240,250,0.02)' : 'rgba(240,240,250,0.06)'),
                                       opacity: isCompleted ? 0.9 : 1
                                     }}
                                     title={`${format(date, 'MMM d, yyyy')}${isCompleted ? ': Completed' : ''}`}
                                   />
                                 );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center align-top pt-8">
                      {renderStreakCell(streak)}
                    </td>
                    <td className="p-4 text-center align-top pt-8">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={() => onArchive(habit.id)}
                          className="p-2 text-spectral/15 hover:text-spectral/60 hover:bg-[rgba(240,240,250,0.06)] rounded transition-colors"
                          title="Archive habit"
                        >
                          <Archive size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(habit.id)}
                          className="p-2 text-spectral/15 hover:text-spectral/60 hover:bg-[rgba(240,240,250,0.06)] rounded transition-colors"
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
  // Left section fixed width
  const LEFT_W = 220;
  // Center stats fixed width
  const STATS_W = 176;

  // --- Render Week & Month View ---
  return (
    <div className="space-y-3" data-purpose="habit-list">

      {/* Day-of-week column headers (week view only) */}
      {timeRange === 'week' && (
        <div className="flex items-center" style={{ paddingLeft: 16, paddingRight: 16 }}>
          {/* Spacer: mirrors card left section */}
          <div className="flex-1" />
          {/* Spacer: mirrors card center stats */}
          <div className="hidden sm:block" style={{ width: STATS_W, flexShrink: 0 }} />
          {/* Day labels */}
          <div className="flex items-center" style={{ paddingLeft: 17 }}>
            {dates.map((date) => {
              const isToday = isSameDay(date, today);
              return (
                <div
                  key={date.toString()}
                  className="flex flex-col items-center"
                  style={{ width: CELL_W, flexShrink: 0 }}
                >
                  <span className="text-[10px] font-bold text-spectral/20 uppercase tracking-nav">
                    {format(date, 'EEE')}
                  </span>
                  <span className={`text-xs font-bold mt-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-[rgba(240,240,250,0.15)] text-spectral' : 'text-spectral/30'
                  }`}>
                    {format(date, 'd')}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Spacer: mirrors hover-action buttons */}
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
          <div key={habit.id} className="ghost-panel rounded p-4 flex items-center group">

            {/* Left: Icon + Name + Progress */}
            <div className="flex items-center flex-1 min-w-0">
              <div
                className="icon-box"
                style={{ color: color }}
              >
                <HabitIcon
                  iconName={habit.icon}
                  className="w-5 h-5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-micro text-spectral truncate">
                  {habit.name}
                </h3>
                {timeRange === 'week' && progress && (
                  <div className="progress-base">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${progressPercent}%`,
                        backgroundColor: isMet ? 'rgba(240,240,250,0.6)' : 'rgba(240,240,250,0.25)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Center: Weekly badge + Streak (week view) */}
            {timeRange === 'week' && progress && (
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0" style={{ width: STATS_W }}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-micro ${
                  isMet
                    ? 'bg-[rgba(240,240,250,0.10)] text-spectral/80'
                    : 'bg-[rgba(240,240,250,0.04)] text-spectral/30'
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

            {/* Right: Day status circles */}
            <div className="flex items-center flex-shrink-0" style={{ borderLeft: '1px solid rgba(240,240,250,0.06)', paddingLeft: 16 }}>
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
                className="p-1.5 text-spectral/15 hover:text-spectral/60 hover:bg-[rgba(240,240,250,0.06)] rounded transition-colors"
                title="Archive habit"
              >
                <Archive size={15} />
              </button>
              <button
                onClick={() => onDelete(habit.id)}
                className="p-1.5 text-spectral/15 hover:text-spectral/60 hover:bg-[rgba(240,240,250,0.06)] rounded transition-colors"
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