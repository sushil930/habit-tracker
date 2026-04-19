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

// Spectral monochrome scale
const COLORS = ['#f0f0fa', '#c0c0d0', '#9090a8', '#606080', '#404060', '#252540', '#3a3a55'];

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
        color: '#f0f0fa'
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);
  }, [habits]);

  // 6. Global Contribution Graph (Heatmap)
  const heatmapData = useMemo(() => {
    const today = startOfDay(new Date());
    const startDate = subDays(today, 364); 
    const calendarStart = startOfWeek(startDate);

    const weeks = [];
    let current = calendarStart;
    
    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
         const dateStr = format(current, 'yyyy-MM-dd');
         
         let count = 0;
         habits.forEach(h => {
           if (h.logs[dateStr]) count++;
         });
         
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



  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="ghost-panel-elevated p-3 text-xs">
          <p className="font-bold uppercase tracking-micro text-spectral mb-1">{label}</p>
          <p className="text-spectral/60">
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
        <div className="w-16 h-16 rounded bg-[rgba(240,240,250,0.04)] border border-[rgba(240,240,250,0.08)] flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-spectral/20" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-nav text-spectral">No data available</h3>
        <p className="text-xs text-spectral/30 uppercase tracking-micro mt-2">Start tracking habits to see your analytics.</p>
      </div>
    );
  }

  // Spectral heatmap intensity
  const getHeatmapColor = (intensity: number): string => {
    switch (intensity) {
        case 1: return 'rgba(240,240,250,0.12)';
        case 2: return 'rgba(240,240,250,0.25)';
        case 3: return 'rgba(240,240,250,0.45)';
        case 4: return 'rgba(240,240,250,0.75)';
        default: return 'rgba(240,240,250,0.04)';
    }
  };

  // Chart styling constants — all spectral
  const axisColor = 'rgba(240,240,250,0.25)';
  const tooltipCursorColor = 'rgba(240,240,250,0.04)';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">


      {/* Top Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ghost-panel p-5 sm:p-6 flex flex-col justify-between group hover:bg-[rgba(240,240,250,0.06)] transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-spectral/30" />
            <p className="text-[10px] font-bold uppercase tracking-nav text-spectral/30">Active Habits</p>
          </div>
          <p className="text-4xl font-light text-spectral tracking-tight">{totalActive}</p>
        </div>

        <div className="ghost-panel p-5 sm:p-6 flex flex-col justify-between group hover:bg-[rgba(240,240,250,0.06)] transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-spectral/30" />
            <p className="text-[10px] font-bold uppercase tracking-nav text-spectral/30">Completions</p>
          </div>
          <p className="text-4xl font-light text-spectral tracking-tight">{totalCompletions}</p>
        </div>

        <div className="ghost-panel p-5 sm:p-6 flex flex-col justify-between group hover:bg-[rgba(240,240,250,0.06)] transition-all duration-300">
           <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={14} className="text-spectral/30" />
            <p className="text-[10px] font-bold uppercase tracking-nav text-spectral/30">Success Rate</p>
          </div>
          <p className="text-4xl font-light text-spectral tracking-tight">{avgSuccessRate}<span className="text-2xl text-spectral/30 font-light ml-1">%</span></p>
        </div>

        <div className="ghost-panel p-5 sm:p-6 flex flex-col justify-between group hover:bg-[rgba(240,240,250,0.06)] transition-all duration-300">
           <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-spectral/30" />
            <p className="text-[10px] font-bold uppercase tracking-nav text-spectral/30">Best Streak</p>
          </div>
          <p className="text-4xl font-light text-spectral tracking-tight">{bestStreak}</p>
        </div>
      </div>

      {/* Contribution Graph (Heatmap) */}
      <div className="ghost-panel p-6 overflow-hidden">
        <div className="mb-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
                <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Yearly Activity</h3>
                <p className="text-[10px] text-spectral/20 uppercase tracking-micro">Contributions</p>
            </div>
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-spectral/30 uppercase tracking-micro">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(240,240,250,0.04)' }}></div>
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(240,240,250,0.12)' }}></div>
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(240,240,250,0.25)' }}></div>
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(240,240,250,0.45)' }}></div>
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(240,240,250,0.75)' }}></div>
            </div>
            <span>More</span>
          </div>
        </div>
        
        <div className="overflow-x-auto pb-2">
            <div className="min-w-[700px]">
                <div className="flex gap-1">
                    {heatmapData.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1">
                            {week.map((day, dIndex) => (
                                <div 
                                    key={day.dateStr}
                                    className="w-[14px] h-[14px] rounded-[3px] transition-all duration-300 hover:scale-125 hover:z-10 relative cursor-pointer"
                                    style={{ backgroundColor: getHeatmapColor(day.intensity) }}
                                    title={`${format(day.date, 'MMM d, yyyy')}: ${day.count} habits`}
                                >
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-between text-[10px] text-spectral/20 uppercase tracking-micro mt-2 min-w-[700px] px-1">
                 <span>{format(subDays(new Date(), 364), 'MMM')}</span>
                 <span>{format(subDays(new Date(), 270), 'MMM')}</span>
                 <span>{format(subDays(new Date(), 180), 'MMM')}</span>
                 <span>{format(subDays(new Date(), 90), 'MMM')}</span>
                 <span>{format(new Date(), 'MMM')}</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Activity Trend - Takes up 2/3 columns */}
        <div className="ghost-panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Activity Trend</h3>
              <p className="text-[10px] text-spectral/20 uppercase tracking-micro">Last 30 Days</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f0f0fa" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f0f0fa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} horizontal={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: axisColor, fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fill: axisColor, fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="natural" 
                  dataKey="count" 
                  stroke="#f0f0fa" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#000000', fill: '#f0f0fa' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Performance - Takes up 1/3 column */}
        <div className="ghost-panel p-6">
           <div className="mb-8 flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Weekly Focus</h3>
              <p className="text-[10px] text-spectral/20 uppercase tracking-micro">Daily Volume</p>
           </div>
           <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <defs>
                   <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#f0f0fa" stopOpacity={0.6}/>
                     <stop offset="100%" stopColor="#f0f0fa" stopOpacity={0.15}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid vertical={false} horizontal={false} />
                 <XAxis 
                   dataKey="name" 
                   tick={{ fill: axisColor, fontSize: 10 }} 
                   axisLine={false} 
                   tickLine={false}
                 />
                 <YAxis 
                   tick={{ fill: axisColor, fontSize: 10 }} 
                   axisLine={false} 
                   tickLine={false}
                   allowDecimals={false}
                 />
                 <Tooltip cursor={{ fill: tooltipCursorColor }} content={<CustomTooltip />} />
                 <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={40}>
                    {dayOfWeekData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         {/* Top Habits Leaderboard */}
         <div className="ghost-panel p-6">
            <div className="mb-8 flex flex-col gap-1">
               <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Consistency Tracker</h3>
               <p className="text-[10px] text-spectral/20 uppercase tracking-micro">Top Performing Habits</p>
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
                    tick={{ fill: 'rgba(240,240,250,0.5)', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rate" radius={[12, 12, 12, 12]} barSize={10} background={{ fill: 'rgba(240,240,250,0.04)', radius: 12 }}>
                    {consistencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#f0f0fa" fillOpacity={0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Category Distribution */}
         <div className="ghost-panel p-6">
           <div className="mb-8 flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Category Split</h3>
              <p className="text-[10px] text-spectral/20 uppercase tracking-micro">Effort Distribution</p>
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
                     paddingAngle={4}
                     cornerRadius={6}
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
                      formatter={(value) => <span className="text-[10px] text-spectral/40 uppercase tracking-micro font-bold ml-1">{value}</span>}
                   />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="text-spectral/20 text-[10px] uppercase tracking-micro">No category data yet</div>
             )}
           </div>
         </div>
      </div>


    </div>
  );
};