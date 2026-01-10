import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { isTauri } from '@tauri-apps/api/core';
import type { Habit } from '../types';
import { sendHabitNotification } from './notificationService';

const REMINDER_SENT_PREFIX = 'habitflow_reminder_sent_v1';
const MISSED_SENT_KEY_PREFIX = 'habitflow_missed_sent_v1';
const MISSED_ALERT_TIME = '21:00';

function getTodayStr(now: Date): string {
  return format(now, 'yyyy-MM-dd');
}

function getNowTimeStr(now: Date): string {
  return format(now, 'HH:mm');
}

function reminderSentKey(habitId: string, dateStr: string, timeStr: string): string {
  return `${REMINDER_SENT_PREFIX}:${habitId}:${dateStr}:${timeStr}`;
}

export function useDesktopNotificationScheduler(habits: Habit[]) {
  const habitsRef = useRef<Habit[]>(habits);

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  useEffect(() => {
    if (!isTauri()) return;

    const tick = () => {
      const now = new Date();
      const dateStr = getTodayStr(now);
      const timeStr = getNowTimeStr(now);
      const currentHabits = habitsRef.current;

      // 1) Reminder notifications (per habit, optional reminderTime)
      for (const habit of currentHabits) {
        if (habit.archived) continue;
        if (!habit.reminderTime) continue;
        if (habit.reminderTime !== timeStr) continue;

        const doneToday = !!habit.logs?.[dateStr];
        if (doneToday) continue;

        const key = reminderSentKey(habit.id, dateStr, timeStr);
        try {
          if (localStorage.getItem(key) === '1') continue;
          localStorage.setItem(key, '1');
        } catch {
          // If localStorage fails, still attempt to notify.
        }

        void sendHabitNotification('Habit reminder', habit.name);
      }

      // 2) Missed habit alerts (daily habits only, once per day)
      if (timeStr === MISSED_ALERT_TIME) {
        const missedKey = `${MISSED_SENT_KEY_PREFIX}:${dateStr}`;
        try {
          if (localStorage.getItem(missedKey) === '1') return;
          localStorage.setItem(missedKey, '1');
        } catch {
          // ignore
        }

        const missed = currentHabits
          .filter(h => !h.archived)
          .filter(h => (h.frequency?.type ?? 'daily') === 'daily')
          .filter(h => !h.logs?.[dateStr]);

        if (missed.length > 0) {
          const top = missed.slice(0, 3).map(h => h.name).join(', ');
          const suffix = missed.length > 3 ? ` (+${missed.length - 3} more)` : '';
          void sendHabitNotification('Missed habits today', `${top}${suffix}`);
        }
      }
    };

    // Run once on mount, then every 30s.
    tick();
    const intervalId = window.setInterval(tick, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);
}
