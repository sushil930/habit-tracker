import React, { useMemo } from 'react';
import { format, isSameDay, startOfDay, getDay, isAfter, getWeek } from 'date-fns';
import { Habit, TimeRange } from '../types';
import { Check, Flame, Trash2, Sparkles, Archive } from 'lucide-react';
import { calculateStreak } from '../services/habitService';
import { HabitIcon } from './HabitIcon';

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
        <Flame className={`${iconClass} transition-all duration-500`} />
        <span className={textClass}>{streak}</span>
      </div>
    );
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
            <Flame className="w-12 h-12 text-indigo-500 fill-indigo-100 dark:fill-indigo-900/30" strokeWidth={1.5} />
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

  // --- Render Week & Month View (Checkbox Grid) ---
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <th className="p-4 w-64 font-medium text-slate-500 dark:text-slate-400 text-sm sticky left-0 bg-slate-50/50 dark:bg-slate-950/50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-none">Habit</th>
              {dates.map((date) => {
                const isToday = isSameDay(date, today);
                return (
                  <th key={date.toString()} className={`p-4 text-center min-w-[3.5rem] ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{format(date, 'EEE')}</span>
                      <span className={`text-sm font-semibold mt-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {format(date, 'd')}
                      </span>
                    </div>
                  </th>
                );
              })}
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
                  <td className="p-4 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-none">
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isTailwind ? color.replace('bg-', 'text-').replace('500', '600') + ' bg-opacity-10' : ''}`}
                        style={!isTailwind ? { backgroundColor: color + '20', color: color } : {}}
                      >
                        <HabitIcon iconName={habit.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-200 whitespace-nowrap">{habit.name}</p>
                        {streak > 3 && <p className="text-xs text-orange-500 flex items-center gap-1"><Flame size={10} /> On fire!</p>}
                      </div>
                    </div>
                  </td>
                  {dates.map((date) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isCompleted = !!habit.logs[dateStr];
                    const isToday = isSameDay(date, today);
                    const isFuture = date > today;

                    return (
                      <td key={dateStr} className={`p-2 text-center ${isToday ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}>
                        <button
                          onClick={() => !isFuture && onToggle(habit.id, date)}
                          disabled={isFuture}
                          className={`
                            relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 mx-auto
                            ${isFuture ? 'opacity-20 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'}
                            ${isCompleted 
                              ? `text-white shadow-md shadow-indigo-200 dark:shadow-none scale-100 ${isTailwind ? color : ''}` 
                              : 'bg-slate-100 dark:bg-slate-800 text-transparent scale-90 hover:scale-95'
                            }
                          `}
                          style={isCompleted && !isTailwind ? { backgroundColor: color } : {}}
                        >
                          <Check className={`w-4 h-4 transition-transform duration-300 ${isCompleted ? 'scale-100 rotate-0' : 'scale-50 -rotate-45'}`} strokeWidth={3} />
                        </button>
                      </td>
                    );
                  })}
                  <td className="p-4 text-center">
                    {renderStreakCell(streak)}
                  </td>
                  <td className="p-4 text-center">
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
};