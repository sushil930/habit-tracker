import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Habit } from '../types';
import { calculateCompletionRate, calculateLongestStreak } from '../services/habitService';

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, 
  LineChart, Line, PieChart, Pie, Legend, Area, AreaChart
} from 'recharts';
import { format, subDays, startOfDay, getDay, parseISO, eachDayOfInterval, startOfWeek, addDays, isAfter, subWeeks, addWeeks, subMonths, addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { TrendingUp, Calendar, PieChart as PieChartIcon, Activity, Zap, Lightbulb, X, RefreshCw, Target, Plus, BarChart2 } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface StatsViewProps {
  habits: Habit[];
  darkMode?: boolean;
  onAddHabit?: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9', '#64748b'];

export const StatsView: React.FC<StatsViewProps> = ({ habits, darkMode = false, onAddHabit }) => {

  // Empty state check
  const activeHabits = habits.filter(h => !h.archived);
  const hasAnyData = habits.some(h => Object.keys(h.logs).length > 0);

  if (activeHabits.length === 0) {
    return (
      <EmptyState
        icon={BarChart2}
        title="No Active Habits Yet"
        description="Start tracking habits to see detailed statistics, insights, and visualizations of your progress over time."
        action={onAddHabit ? {
          label: "Create Your First Habit",
          onClick: onAddHabit
        } : undefined}
      />
    );
  }

  if (!hasAnyData) {
    return (
      <EmptyState
        icon={Activity}
        title="No Data to Analyze"
        description="Complete some habits to start generating statistics. Your journey begins with your first check!"
        action={{
          label: "Go to Dashboard",
          onClick: () => window.history.back()
        }}
      />
    );
  }



  // 1. Total Stats Calculation
  const { totalCompletions, avgSuccessRate, totalActive, bestStreak } = useMemo(() => {
    const active = habits.filter(h => !h.archived);
    const completions = habits.reduce((acc, h) => acc + Object.keys(h.logs).length, 0);
    
    let totalRate = 0;
    let maxStreak = 0;
    if (habits.length > 0) {
      totalRate = habits.reduce((acc, h) => acc + calculateCompletionRate(h, 30), 0) / habits.length;
      maxStreak = habits.reduce((max, h) => Math.max(max, calculateLongestStreak(h)), 0);
    }

    return {
      totalCompletions: completions,
      avgSuccessRate: Math.round(totalRate),
      totalActive: active.length,
      bestStreak: maxStreak
    };
  }, [habits]);

  // 2. Trend Data (Last 30 Days)
  const trendData = useMemo(() => {
    const end = startOfDay(new Date());
    const start = subDays(end, 29);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      let count = 0;
      habits.forEach(h => {
        if (h.logs[dateStr]) count++;
      });
      return {
        date: format(day, 'MMM d'),
        fullDate: dateStr,
        count: count
      };
    });
  }, [habits]);

  // 3. Day of Week Performance
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    habits.forEach(h => {
      Object.keys(h.logs).forEach(dateIso => {
        const date = parseISO(dateIso);
        const dayIndex = getDay(date);
        counts[dayIndex]++;
      });
    });

    // Rotate so Monday is first (optional, but standard for productivity apps)
    // Source: Sun(0) ... Sat(6). Target: Mon ... Sun
    const rotatedDays = [...days.slice(1), days[0]];
    const rotatedCounts = [...counts.slice(1), counts[0]];

    return rotatedDays.map((day, i) => ({
      name: day,
      value: rotatedCounts[i]
    }));
  }, [habits]);

  // 4. Category Distribution
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    
    habits.forEach(h => {
      const completionCount = Object.keys(h.logs).length;
      if (completionCount > 0) {
        catMap[h.category] = (catMap[h.category] || 0) + completionCount;
      }
    });

    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [habits]);

  // 5. Habit Consistency (Completion Rate)
  const consistencyData = useMemo(() => {
    return habits
      .map(habit => ({
        name: habit.name,
        rate: calculateCompletionRate(habit, 30),
        color: habit.color.startsWith('bg-') ? '#6366f1' : habit.color 
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10); // Top 10
  }, [habits]);

  // 6. Global Contribution Graph (Heatmap)
  const heatmapData = useMemo(() => {
    const today = startOfDay(new Date());
    // Go back 52 weeks to show a full year view roughly
    const startDate = subDays(today, 364); 
    const calendarStart = startOfWeek(startDate); // Start on Sunday

    const weeks = [];
    let current = calendarStart;
    
    // Generate 53 weeks of data to cover the full range
    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
         const dateStr = format(current, 'yyyy-MM-dd');
         
         // Count total completions across all habits
         let count = 0;
         habits.forEach(h => {
           if (h.logs[dateStr]) count++;
         });
         
         // Intensity levels for coloring (0-4 like GitHub)
         let intensity = 0;
         if (count > 0) intensity = 1;
         if (count >= 3) intensity = 2;
         if (count >= 6) intensity = 3;
         if (count >= 10) intensity = 4;

         week.push({ 
             date: current, 
             dateStr, 
             count, 
             intensity,
             isFuture: isAfter(current, today)
         });
         current = addDays(current, 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [habits]);

  // 7. Target Achievement Rate
  const targetAchievementData = useMemo(() => {
    return habits.map(habit => {
      const freq = habit.frequency || { type: 'daily', goal: 1 };
      let successCount = 0;
      let totalPeriods = 0;
      
      if (freq.type === 'daily') {
        // Use last 30 days
        const end = startOfDay(new Date());
        const start = subDays(end, 29);
        const days = eachDayOfInterval({ start, end });
        totalPeriods = 30;
        successCount = days.filter(d => habit.logs[format(d, 'yyyy-MM-dd')]).length;
      } else if (freq.type === 'weekly') {
        // Check last 8 weeks
        const end = startOfDay(new Date());
        const start = subWeeks(end, 8);
        let current = startOfWeek(start, { weekStartsOn: 1 });
        const endWeek = startOfWeek(end, { weekStartsOn: 1 });
        
        while (current <= endWeek) {
           const weekEnd = addDays(current, 6);
           const weekDays = eachDayOfInterval({ start: current, end: weekEnd });
           const count = weekDays.filter(d => habit.logs[format(d, 'yyyy-MM-dd')]).length;
           if (count >= freq.goal) successCount++;
           totalPeriods++;
           current = addWeeks(current, 1);
        }
      } else if (freq.type === 'monthly') {
        // Check last 6 months
        const end = startOfDay(new Date());
        const start = subMonths(end, 6);
        let current = startOfMonth(start);
        const endMonth = startOfMonth(end);
        
        while (current <= endMonth) {
           const monthEnd = endOfMonth(current);
           const monthDays = eachDayOfInterval({ start: current, end: monthEnd });
           const count = monthDays.filter(d => habit.logs[format(d, 'yyyy-MM-dd')]).length;
           if (count >= freq.goal) successCount++;
           totalPeriods++;
           current = addMonths(current, 1);
        }
      }
      
      const rate = totalPeriods > 0 ? Math.round((successCount / totalPeriods) * 100) : 0;
      
      return {
        name: habit.name,
        rate,
        type: freq.type,
        goal: freq.goal,
        color: habit.color
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [habits]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 shadow-xl rounded-lg text-xs">
          <p className="font-semibold text-slate-900 dark:text-slate-200 mb-1">{label}</p>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium">
            {payload[0].name === 'rate' ? `${payload[0].value}% Success` : `${payload[0].value} Completions`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (habits.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">No data available</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Start tracking habits to see your analytics.</p>
      </div>
    );
  }

  // Color scale for heatmap (Emerald for "Growth")
  const getHeatmapColor = (intensity: number) => {
    switch (intensity) {
        case 1: return 'bg-emerald-200 dark:bg-emerald-900';
        case 2: return 'bg-emerald-300 dark:bg-emerald-800';
        case 3: return 'bg-emerald-500 dark:bg-emerald-600';
        case 4: return 'bg-emerald-700 dark:bg-emerald-500';
        default: return 'bg-slate-100 dark:bg-slate-800'; // level 0
    }
  };

  // Chart styling constants
  const axisColor = darkMode ? '#64748b' : '#94a3b8'; // slate-500 vs slate-400
  const gridColor = darkMode ? '#334155' : '#f1f5f9'; // slate-700 vs slate-100
  const tooltipCursorColor = darkMode ? '#1e293b' : '#f8fafc';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">


      {/* Top Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 shadow-sm border border-white/20 dark:border-white/10">
          <div className="flex items-center gap-2 mb-4 opacity-70">
            <Activity size={16} className="text-indigo-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Active Habits</p>
          </div>
          <p className="text-4xl font-light text-slate-800 dark:text-white tracking-tight">{totalActive}</p>
        </div>

        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 shadow-sm border border-white/20 dark:border-white/10">
          <div className="flex items-center gap-2 mb-4 opacity-70">
            <TrendingUp size={16} className="text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completions</p>
          </div>
          <p className="text-4xl font-light text-slate-800 dark:text-white tracking-tight">{totalCompletions}</p>
        </div>

        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 shadow-sm border border-white/20 dark:border-white/10">
           <div className="flex items-center gap-2 mb-4 opacity-70">
            <PieChartIcon size={16} className="text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Success Rate</p>
          </div>
          <p className="text-4xl font-light text-slate-800 dark:text-white tracking-tight">{avgSuccessRate}<span className="text-2xl text-slate-400 font-light ml-1">%</span></p>
        </div>

        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 shadow-sm border border-white/20 dark:border-white/10">
           <div className="flex items-center gap-2 mb-4 opacity-70">
            <Zap size={16} className="text-orange-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Best Streak</p>
          </div>
          <p className="text-4xl font-light text-slate-800 dark:text-white tracking-tight">{bestStreak}</p>
        </div>
      </div>

      {/* Contribution Graph (Heatmap) */}
      <div className="glass-panel p-6 rounded-2xl overflow-hidden">
        <div className="mb-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Yearly Activity</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contributions</p>
            </div>
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800"></div>
              <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900"></div>
              <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-800"></div>
              <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-600"></div>
              <div className="w-3 h-3 rounded-sm bg-emerald-700 dark:bg-emerald-500"></div>
            </div>
            <span>More</span>
          </div>
        </div>
        
        <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div className="min-w-[700px]">
                <div className="flex gap-1">
                    {heatmapData.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1">
                            {week.map((day, dIndex) => (
                                <div 
                                    key={day.dateStr}
                                    className={`w-[14px] h-[14px] rounded-[4px] transition-all duration-300 hover:scale-125 hover:z-10 relative cursor-pointer ${getHeatmapColor(day.intensity)}`}
                                    title={`${format(day.date, 'MMM d, yyyy')}: ${day.count} habits`}
                                >
                                    {/* Tooltip for better UX */}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-2 min-w-[700px] px-1">
                 {/* Simple Month Labels logic - simplified for layout */}
                 <span>{format(subDays(new Date(), 364), 'MMM')}</span>
                 <span>{format(subDays(new Date(), 270), 'MMM')}</span>
                 <span>{format(subDays(new Date(), 180), 'MMM')}</span>
                 <span>{format(subDays(new Date(), 90), 'MMM')}</span>
                 <span>{format(new Date(), 'MMM')}</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Trend - Takes up 2/3 columns */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Activity Trend</h3>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last 30 Days</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} horizontal={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: axisColor, fontSize: 11 }} 
                  axisLine={false} 
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fill: axisColor, fontSize: 11 }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="natural" 
                  dataKey="count" 
                  stroke="#818cf8" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  activeDot={{ r: 6, strokeWidth: 3, stroke: '#ffffff', fill: '#4f46e5' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Performance - Takes up 1/3 column */}
        <div className="glass-panel p-6 rounded-2xl">
           <div className="mb-8 flex flex-col gap-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Weekly Focus</h3>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Volume</p>
           </div>
           <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <defs>
                   <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#818cf8" />
                     <stop offset="100%" stopColor="#4f46e5" />
                   </linearGradient>
                 </defs>
                 <CartesianGrid vertical={false} horizontal={false} />
                 <XAxis 
                   dataKey="name" 
                   tick={{ fill: axisColor, fontSize: 11 }} 
                   axisLine={false} 
                   tickLine={false}
                 />
                 <YAxis 
                   tick={{ fill: axisColor, fontSize: 11 }} 
                   axisLine={false} 
                   tickLine={false}
                   allowDecimals={false}
                 />
                 <Tooltip cursor={{ fill: tooltipCursorColor }} content={<CustomTooltip />} />
                 <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={40}>
                    {dayOfWeekData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#barGradient)" fillOpacity={0.9} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Top Habits Leaderboard */}
         <div className="glass-panel p-6 rounded-2xl">
            <div className="mb-8 flex flex-col gap-1">
               <h3 className="font-semibold text-slate-800 dark:text-slate-100">Consistency Tracker</h3>
               <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Top Performing Habits</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consistencyData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid vertical={false} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={140} 
                    tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontSize: 12, fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rate" radius={[12, 12, 12, 12]} barSize={12} background={{ fill: darkMode ? '#1e293b' : '#f1f5f9', radius: 12 }}>
                    {consistencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Category Distribution */}
         <div className="glass-panel p-6 rounded-2xl">
           <div className="mb-8 flex flex-col gap-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Category Split</h3>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effort Distribution</p>
           </div>
           <div className="h-72 w-full flex items-center justify-center">
             {categoryData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={categoryData}
                     cx="50%"
                     cy="50%"
                     innerRadius={70}
                     outerRadius={90}
                     paddingAngle={6}
                     cornerRadius={10}
                     dataKey="value"
                     strokeWidth={0}
                   >
                     {categoryData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip />
                   <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      iconType="circle"
                      formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-1">{value}</span>}
                   />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="text-slate-400 dark:text-slate-500 text-sm">No category data yet</div>
             )}
           </div>
         </div>
      </div>

      {/* Target Success Rate */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="mb-8 flex flex-col gap-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Goal Adherence</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Success by Frequency</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targetAchievementData.map((item) => (
            <div key={item.name} className="glass-panel p-4 rounded-xl">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">{item.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{item.type} Goal: {item.goal}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                  item.rate >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  item.rate >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                  'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}>
                  {item.rate}%
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                    item.rate >= 80 ? 'bg-emerald-500 shadow-emerald-500/50' :
                    item.rate >= 50 ? 'bg-amber-500 shadow-amber-500/50' :
                    'bg-rose-500 shadow-rose-500/50'
                  }`}
                  style={{ width: `${item.rate}%` }}
                />
              </div>
            </div>
          ))}
          {targetAchievementData.length === 0 && (
             <div className="col-span-full text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
               No target data available yet.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};