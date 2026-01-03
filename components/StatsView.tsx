import React, { useMemo } from 'react';
import { Habit } from '../types';
import { calculateCompletionRate, calculateLongestStreak } from '../services/habitService';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, 
  LineChart, Line, PieChart, Pie, Legend, Area, AreaChart
} from 'recharts';
import { format, subDays, startOfDay, getDay, parseISO, eachDayOfInterval, startOfWeek, addDays, isAfter } from 'date-fns';
import { TrendingUp, Calendar, PieChart as PieChartIcon, Activity, Zap } from 'lucide-react';

interface StatsViewProps {
  habits: Habit[];
  darkMode?: boolean;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9', '#64748b'];

export const StatsView: React.FC<StatsViewProps> = ({ habits, darkMode = false }) => {
  
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700 shadow-xl rounded-lg text-xs">
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
    <div className="space-y-6 animate-in fade-in sli2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 relative overflow-hidden group transition-colors">
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Habits</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{totalActive}</p>
          </div>
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={64} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-indigo-100 dark:to-indigo-900 absolute bottom-0 left-0" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 relative overflow-hidden group transition-colors">
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Completions</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-500 mt-2">{totalCompletions}</p>
          </div>
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-emerald-600 dark:text-emerald-500" />
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-100 dark:to-emerald-900 absolute bottom-0 left-0" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 relative overflow-hidden group transition-colors">
           <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. 30-Day Rate</p>
            <p className="text-3xl font-bold text-amber-500 dark:text-amber-400 mt-2">{avgSuccessRate}%</p>
          </div>
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <PieChartIcon size={64} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-amber-100 dark:to-amber-900 absolute bottom-0 left-0" />
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 relative overflow-hidden group transition-colors">
           <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Highest Streak</p>
            <p className="text-3xl font-bold text-orange-500 dark:text-orange-400 mt-2">{bestStreak}</p>
          </div>
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={64} className="text-orange-500 dark:text-orange-400" />
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-orange-100 dark:to-orangeon-opacity">
            <PieChartIcon size={64} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-amber-100 dark:to-amber-900 absolute bottom-0 left-0" />
        </div>
      </div>

      {/* Contribution Graph (Heatmap) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="mb-6 flex items-center justify-between">
            <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Yearly Activity</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your total habit contributions over the last year</p>
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
                                    className={`w-3 h-3 rounded-[2px] transition-all hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600 hover:z-10 relative group ${getHeatmapColor(day.intensity)}`}
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
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 lg:col-span-2 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Activity Trend</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daily completions over the last 30 days</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
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
                  type="monotone" 
                  dataKey="count" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Performance - Takes up 1/3 column */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
           <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Weekly Focus</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total completions by day</p>
           </div>
           <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
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
                 <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {dayOfWeekData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index > 4 ? '#10b981' : '#6366f1'} fillOpacity={0.8} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Top Habits Leaderboard */}
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="mb-6">
               <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Consistency Leaderboard</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400">Top habits by completion rate (last 30 days)</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consistencyData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
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
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={24} background={{ fill: darkMode ? '#1e293b' : '#f8fafc' }}>
                    {consistencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Category Distribution */}
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
           <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Category Distribution</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Where you are spending your effort</p>
           </div>
           <div className="h-72 w-full flex items-center justify-center">
             {categoryData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={categoryData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={100}
                     paddingAngle={5}
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
    </div>
  );
};