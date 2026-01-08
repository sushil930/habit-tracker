import { Habit } from '../types';
import { addDays, getDay, parseISO, subDays, startOfDay, isAfter, differenceInDays } from 'date-fns';
import { calculateLongestStreak } from './habitService';

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'neutral' | 'tip';
  title: string;
  description: string;
  habitId?: string;
  score: number; // Relevance score to sort by
}

export const generateInsights = (habits: Habit[]): Insight[] => {
  const insights: Insight[] = [];
  const activeHabits = habits.filter(h => !h.archived);
  const today = startOfDay(new Date());
  const periodDays = 28;
  const start = subDays(today, periodDays - 1);

  if (activeHabits.length === 0) return [];

  // Build day-of-week denominators for the period
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < periodDays; i++) {
    const d = addDays(start, i);
    dayCounts[getDay(d)]++;
  }

  // Count completions per day-of-week across all habits in the period
  const completionCounts = [0, 0, 0, 0, 0, 0, 0];
  activeHabits.forEach(habit => {
    Object.keys(habit.logs).forEach(dateStr => {
      const date = parseISO(dateStr);
      if (isAfter(date, subDays(start, 1)) && !isAfter(date, today)) {
        completionCounts[getDay(date)]++;
      }
    });
  });

  const denom = (dow: number) => Math.max(1, dayCounts[dow] * activeHabits.length);
  const rate = (dow: number) => completionCounts[dow] / denom(dow);

  const weekdayRate = (rate(1) + rate(2) + rate(3) + rate(4) + rate(5)) / 5;
  const weekendRate = (rate(0) + rate(6)) / 2;
  const midweekRate = (rate(2) + rate(3) + rate(4)) / 3; // Tue/Wed/Thu
  const edgesRate = (rate(1) + rate(5)) / 2; // Mon/Fri

  // 1) Weekend drops
  if (weekdayRate >= 0.15 && weekdayRate - weekendRate >= 0.15) {
    insights.push({
      id: 'weekend-drop',
      type: 'warning',
      title: 'Weekend drops are hurting momentum',
      description: `Your completion rate is about ${Math.round(weekdayRate * 100)}% on weekdays vs ${Math.round(weekendRate * 100)}% on weekends. Try a lighter “minimum version” for Sat/Sun.`,
      score: 85
    });
  }

  // 2) Mid-week peaks
  if (midweekRate >= 0.2 && midweekRate - edgesRate >= 0.12) {
    insights.push({
      id: 'midweek-peak',
      type: 'success',
      title: 'Mid-week is your peak window',
      description: `Tue–Thu runs hotter (${Math.round(midweekRate * 100)}%) than Mon/Fri (${Math.round(edgesRate * 100)}%). Schedule harder habits mid-week and keep Mon/Fri simple.`,
      score: 70
    });
  }

  // 3) Habit inconsistency (moderate rate but short streaks)
  const inconsistent = activeHabits
    .map(habit => {
      const inRange = Object.keys(habit.logs)
        .map(d => parseISO(d))
        .filter(d => isAfter(d, subDays(start, 1)) && !isAfter(d, today))
        .sort((a, b) => a.getTime() - b.getTime());

      const completedDays = inRange.length;
      const completionRate = completedDays / periodDays;

      let maxStreak = 0;
      let streak = 0;
      let prev: Date | null = null;
      for (const d of inRange) {
        if (!prev) {
          streak = 1;
        } else {
          const diff = differenceInDays(d, prev);
          streak = diff === 1 ? streak + 1 : 1;
        }
        if (streak > maxStreak) maxStreak = streak;
        prev = d;
      }

      return { habit, completionRate, maxStreak };
    })
    .filter(x => x.completionRate >= 0.35 && x.completionRate <= 0.75 && x.maxStreak <= 2)
    .sort((a, b) => b.completionRate - a.completionRate);

  if (inconsistent.length > 0) {
    const target = inconsistent[0];
    insights.push({
      id: `inconsistent-${target.habit.id}`,
      type: 'tip',
      title: `Make “${target.habit.name}” easier to repeat`,
      description: `You’re doing it sometimes (${Math.round(target.completionRate * 100)}%), but streaks stay short. Pick a daily trigger (same time/place) or shrink the task to keep streaks going.`,
      habitId: target.habit.id,
      score: 90
    });
  }

  // 4) Struggling habit (very low rate but not zero)
  const struggling = activeHabits
    .map(habit => {
      const completedDays = Object.keys(habit.logs)
        .map(d => parseISO(d))
        .filter(d => isAfter(d, subDays(start, 1)) && !isAfter(d, today)).length;
      return { habit, completionRate: completedDays / periodDays };
    })
    .find(x => x.completionRate > 0 && x.completionRate < 0.2);

  if (struggling) {
    insights.push({
      id: `struggle-${struggling.habit.id}`,
      type: 'warning',
      title: `Trouble with “${struggling.habit.name}”`,
      description: `This habit is under 20% lately. Try reducing the scope (2-minute version), or set a fixed time window to make it automatic.`,
      habitId: struggling.habit.id,
      score: 88
    });
  }

  // 5) Positive reinforcement
  if (weekdayRate >= 0.8) {
    insights.push({
      id: 'weekday-warrior',
      type: 'success',
      title: 'Weekday consistency is strong',
      description: 'Weekdays are consistently high. Protect that routine and keep weekends intentionally lighter.',
      score: 55
    });
  }

  return insights.sort((a, b) => b.score - a.score);
};

export const generateAIInsights = async (apiKey: string, habits: Habit[], provider: string = 'openai'): Promise<Insight[]> => {
  const activeHabits = habits.filter(h => !h.archived);
  
  const summary = activeHabits.map(h => {
    const logs = Object.keys(h.logs).sort();
    const last30Days = logs.filter(d => isAfter(parseISO(d), subDays(new Date(), 30)));
    return {
      name: h.name,
      category: h.category,
      frequency: h.frequency,
      totalCompletions: logs.length,
      last30DaysCount: last30Days.length,
      streak: calculateLongestStreak(h)
    };
  });

  const prompt = `Analyze these habits and provide 3 short, actionable insights.
Data: ${JSON.stringify(summary)}

Return ONLY a JSON array with objects having these fields:
- id: string (unique)
- type: "warning" | "success" | "neutral" | "tip"
- title: string (short)
- description: string (max 2 sentences)
- score: number (0-100 relevance)`;

  try {
    let content = '';

    const handleResponse = async (response: Response) => {
      if (!response.ok) {
        let errorMsg = response.statusText;
        try {
          const errorData = await response.json();
          // Try to find a meaningful error message in common formats
          errorMsg = errorData.error?.message || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(`API Error (${response.status}): ${errorMsg}`);
      }
      return response.json();
    };

    const pickGeminiModelName = async (): Promise<string> => {
      // Try to discover which Gemini models are available for the provided API key.
      // ListModels returns items like: { name: "models/gemini-1.5-flash", supportedGenerationMethods: ["generateContent", ...] }
      try {
        const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!listResp.ok) throw new Error('ListModels failed');
        const listData = await listResp.json();
        const models = Array.isArray(listData.models) ? listData.models : [];

        const supportsGenerateContent = (m: any) =>
          Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent');

        const gemini = models
          .filter((m: any) => typeof m.name === 'string' && m.name.includes('models/gemini') && supportsGenerateContent(m))
          .map((m: any) => m.name);

        const prefer = (
          gemini.find((n: string) => n.includes('gemini-1.5-flash')) ||
          gemini.find((n: string) => n.includes('gemini-1.5-pro')) ||
          gemini.find((n: string) => n.includes('gemini-1.0')) ||
          gemini[0]
        );

        if (prefer) return prefer;
      } catch {
        // ignore and fall back
      }

      // Fallback list (some keys have different sets enabled)
      return (
        'models/gemini-1.5-flash-latest'
      );
    };

    switch (provider) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a helpful habit tracking assistant. Output valid JSON only." },
              { role: "user", content: prompt }
            ],
            temperature: 0.7
          })
        });
        const data = await handleResponse(response);
        content = data.choices[0].message.content;
        break;
      }

      case 'gemini': {
        const modelName = await pickGeminiModelName();
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a helpful habit tracking assistant. Output valid JSON only.\n\n${prompt}`
              }]
            }],
            generationConfig: { temperature: 0.7 }
          })
        });
        const data = await handleResponse(response);
        content = data.candidates[0].content.parts[0].text;
        break;
      }

      case 'claude': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `You are a helpful habit tracking assistant. Output valid JSON only.\n\n${prompt}`
            }]
          })
        });
        const data = await handleResponse(response);
        content = data.content[0].text;
        break;
      }

      case 'deepseek': {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'You are a helpful habit tracking assistant. Output valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7
          })
        });
        const data = await handleResponse(response);
        content = data.choices[0].message.content;
        break;
      }

      case 'qwen': {
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'qwen-turbo',
            input: {
              messages: [
                { role: 'system', content: 'You are a helpful habit tracking assistant. Output valid JSON only.' },
                { role: 'user', content: prompt }
              ]
            },
            parameters: { temperature: 0.7 }
          })
        });
        const data = await handleResponse(response);
        content = data.output.text;
        break;
      }

      default:
        throw new Error('Unsupported provider');
    }
    
    // Parse JSON from content (handle potential markdown code blocks)
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const insights = JSON.parse(jsonStr);
    
    return insights.map((i: any) => ({
      ...i,
      habitId: 'ai-generated'
    }));
  } catch (error) {
    console.error("AI Insight Generation Failed", error);
    throw error;
  }
};

