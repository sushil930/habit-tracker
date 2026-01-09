import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Habit } from '../types';
import { calculateCompletionRate, calculateLongestStreak } from '../services/habitService';
import { generateInsights, generateAIInsights, Insight } from '../services/insightService';
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

  // Insights State (1-2 per page load, dismiss/regenerate, monthly history)
  const INSIGHT_HISTORY_KEY = 'habitflow_insights_history_v1';
  type InsightLogEntry = {
    ts: string;
    insights: Array<Pick<Insight, 'id' | 'type' | 'title' | 'description' | 'habitId'>>;
  };

  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedInsightIds, setSelectedInsightIds] = useState<string[]>([]);
  const [dismissedInsightIds, setDismissedInsightIds] = useState<string[]>([]);
  const [showInsightHistory, setShowInsightHistory] = useState(false);
  const [monthlyInsightHistory, setMonthlyInsightHistory] = useState<InsightLogEntry[]>([]);
  const hasGeneratedInsightsRef = useRef(false);


  // Multi-AI support
  const AI_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', keyLabel: 'OpenAI API Key', placeholder: 'sk-...' },
    { id: 'gemini', name: 'Gemini', keyLabel: 'Gemini API Key', placeholder: '...' },
    { id: 'claude', name: 'Claude', keyLabel: 'Claude API Key', placeholder: '...' },
    { id: 'deepseek', name: 'DeepSeek', keyLabel: 'DeepSeek API Key', placeholder: '...' },
    { id: 'qwen', name: 'Qwen', keyLabel: 'Qwen API Key', placeholder: '...' },
  ];
  const [aiProvider, setAiProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  useEffect(() => {
    const storedProvider = localStorage.getItem('habitflow_ai_provider') || 'openai';
    setAiProvider(storedProvider);
    const storedKey = localStorage.getItem(`habitflow_${storedProvider}_key`);
    if (storedKey) setApiKey(storedKey);
  }, []);

  useEffect(() => {
    const storedKey = localStorage.getItem(`habitflow_${aiProvider}_key`);
    setApiKey(storedKey || '');
  }, [aiProvider]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(`habitflow_${aiProvider}_key`, key);
    setShowApiKeyInput(false);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAiProvider(e.target.value);
    localStorage.setItem('habitflow_ai_provider', e.target.value);
  };

  const handleGenerateAIInsights = async () => {
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }
    setIsAiLoading(true);
    setAiError(null);
    try {
      const aiInsights = await generateAIInsights(apiKey, habits, aiProvider);
      setInsights(aiInsights);
      setSelectedInsightIds(aiInsights.map(i => i.id));
      // Update history
      const newEntry: InsightLogEntry = { 
        ts: new Date().toISOString(), 
        insights: aiInsights.map(i => ({
          id: i.id,
          type: i.type,
          title: i.title,
          description: i.description,
          habitId: i.habitId
        }))
      };
      const raw = localStorage.getItem(INSIGHT_HISTORY_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, InsightLogEntry[]>) : {};
      const existing = Array.isArray(parsed[monthKey]) ? parsed[monthKey] : [];
      const next = [newEntry, ...existing].slice(0, 50);
      parsed[monthKey] = next;
      localStorage.setItem(INSIGHT_HISTORY_KEY, JSON.stringify(parsed));
      setMonthlyInsightHistory(next);
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate AI insights.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const monthKey = useMemo(() => format(new Date(), 'yyyy-MM'), []);

  const loadMonthlyHistory = () => {
    try {
      const raw = localStorage.getItem(INSIGHT_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Record<string, InsightLogEntry[]>;
      const entries = parsed[monthKey] || [];
      return Array.isArray(entries) ? entries : [];
    } catch {
      return [];
    }
  };

  const appendMonthlyHistory = (entry: InsightLogEntry) => {
    try {
      const raw = localStorage.getItem(INSIGHT_HISTORY_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, InsightLogEntry[]>) : {};
      const existing = Array.isArray(parsed[monthKey]) ? parsed[monthKey] : [];
      const next = [entry, ...existing].slice(0, 50);
      parsed[monthKey] = next;
      localStorage.setItem(INSIGHT_HISTORY_KEY, JSON.stringify(parsed));
      setMonthlyInsightHistory(next);
    } catch {
      // Ignore storage failures
    }
  };

  const pickInsightIds = (all: Insight[]) => {
    const pool = all.slice(0, Math.min(6, all.length));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2).map(i => i.id);
  };

  const generateInsightSession = () => {
    const generated = generateInsights(habits);
    setInsights(generated);
    setDismissedInsightIds([]);

    const pickedIds = pickInsightIds(generated);
    setSelectedInsightIds(pickedIds);

    const pickedInsights = generated
      .filter(i => pickedIds.includes(i.id))
      .map(i => ({ id: i.id, type: i.type, title: i.title, description: i.description, habitId: i.habitId }));

    if (pickedInsights.length > 0) {
      appendMonthlyHistory({ ts: new Date().toISOString(), insights: pickedInsights });
    }
  };

  useEffect(() => {
    if (hasGeneratedInsightsRef.current) return;
    if (habits.length === 0) return;
    hasGeneratedInsightsRef.current = true;
    setMonthlyInsightHistory(loadMonthlyHistory());
    generateInsightSession();
  }, [habits]);

  useEffect(() => {
    if (!showInsightHistory) return;
    setMonthlyInsightHistory(loadMonthlyHistory());
  }, [showInsightHistory]);

  const handleDismissInsight = (id: string) => {
    setDismissedInsightIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleRegenerateInsights = () => {
    generateInsightSession();
  };

  const visibleInsights = useMemo(() => {
    const candidates = selectedInsightIds.length > 0
      ? insights.filter(i => selectedInsightIds.includes(i.id))
      : insights;

    return candidates
      .filter(i => !dismissedInsightIds.includes(i.id))
      .slice(0, 2);
  }, [insights, selectedInsightIds, dismissedInsightIds]);

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      {/* Insights Section */}
      {(visibleInsights.length > 0 || showApiKeyInput || isAiLoading || aiError) && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                <Lightbulb size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Insights</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">({monthKey})</span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={aiProvider}
                onChange={handleProviderChange}
                className="text-xs font-medium border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                style={{ minWidth: 90 }}
                disabled={isAiLoading}
              >
                {AI_PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={handleGenerateAIInsights}
                disabled={isAiLoading}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                title="Generate AI insights"
              >
                <RefreshCw size={12} className={isAiLoading ? "animate-spin" : ""} />
                {isAiLoading ? 'Generating...' : 'Generate AI'}
              </button>
              <button
                onClick={() => setShowApiKeyInput(v => !v)}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline"
                title="Configure API Key"
              >
                Settings
              </button>
            </div>
          </div>

          {showApiKeyInput && (
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {AI_PROVIDERS.find(p => p.id === aiProvider)?.keyLabel}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={AI_PROVIDERS.find(p => p.id === aiProvider)?.placeholder}
                  className="flex-1 text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <button
                  onClick={() => handleSaveApiKey(apiKey)}
                  className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Key is stored locally in your browser.</p>
            </div>
          )}

          {aiError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg">
              {aiError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleInsights.map(insight => (
              <div
                key={insight.id}
                className={`p-4 rounded-xl border relative overflow-hidden group ${
                  insight.type === 'warning' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                  insight.type === 'success' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' :
                  'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    insight.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                    insight.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                  }`}>
                    <Lightbulb size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm mb-1 ${
                      insight.type === 'warning' ? 'text-amber-900 dark:text-amber-200' :
                      insight.type === 'success' ? 'text-emerald-900 dark:text-emerald-200' :
                      'text-indigo-900 dark:text-indigo-200'
                    }`}>
                      {insight.title}
                    </h4>
                    <p className={`text-xs leading-relaxed ${
                      insight.type === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                      insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' :
                      'text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-orange-100 dark:to-orange-900 absolute bottom-0 left-0" />
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

      {/* Target Success Rate */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Target Success Rate</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Percentage of time periods (weeks/months) where you met your goal</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targetAchievementData.map((item) => (
            <div key={item.name} className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">{item.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{item.type} Goal: {item.goal}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${
                  item.rate >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  item.rate >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                  {item.rate}%
                </div>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.rate >= 80 ? 'bg-emerald-500' :
                    item.rate >= 50 ? 'bg-amber-500' :
                    'bg-rose-500'
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