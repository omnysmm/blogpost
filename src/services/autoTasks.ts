// Persistent auto-generation tasks + due detection
import type { AutoTask } from '../store/types';

const key = (userId: string) => `blogpost_autotasks_${userId}`;
const RAN_PREFIX = 'blogpost_autotask_ran_';

export function loadAutoTasks(userId: string): AutoTask[] {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveAutoTasks(userId: string, tasks: AutoTask[]): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(tasks));
  } catch (e) {
    console.error('saveAutoTasks failed', e);
  }
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function localDayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseLocalDateTime(date: string, time: string): number {
  const t = time && time.length >= 5 ? time.slice(0, 5) : '10:00';
  return new Date(`${date}T${t}:00`).getTime();
}

/** Slot key for a day+time (for once-per-slot dedupe). */
function slotKey(day: string, time: string): string {
  return `${RAN_PREFIX}${day}T${time && time.length >= 5 ? time.slice(0, 5) : '10:00'}`;
}

export function markTaskSlotRan(taskId: string, day: string, time: string): void {
  try {
    localStorage.setItem(slotKey(day, time) + taskId, '1');
  } catch {}
}

export function hasTaskSlotRan(taskId: string, day: string, time: string): boolean {
  try {
    return localStorage.getItem(slotKey(day, time) + taskId) === '1';
  } catch {
    return false;
  }
}

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Is this task due right now (and not yet run for this slot)? */
export function isTaskDue(task: AutoTask, now = Date.now()): { due: boolean; day: string; time: string } {
  const time = task.schedule?.time || '10:00';
  const today = localDayKey();

  if (!task.active || !task.topics?.length) return { due: false, day: today, time };

  // Calendar dates
  if (task.scheduledDates?.length) {
    for (const day of task.scheduledDates) {
      const ts = parseLocalDateTime(day, time);
      if (Number.isNaN(ts)) continue;
      if (ts <= now && now - ts <= 48 * 3600_000 && !hasTaskSlotRan(task.id, day, time)) {
        return { due: true, day, time };
      }
    }
    return { due: false, day: today, time };
  }

  // Weekly day-of-week schedule (frequency daily/weekly/custom)
  const dow = DOW[new Date().getDay()];
  const days = task.schedule?.days || [];
  const daysOk =
    task.frequency === 'hourly'
      ? true
      : days.length === 0
        ? true // default: every day at schedule.time
        : days.includes(dow);

  if (!daysOk) return { due: false, day: today, time };

  const ts = parseLocalDateTime(today, time);
  if (ts <= now && now - ts <= 24 * 3600_000 && !hasTaskSlotRan(task.id, today, time)) {
    return { due: true, day: today, time };
  }
  return { due: false, day: today, time };
}

export function pickTopic(task: AutoTask): string {
  const topics = task.topics?.filter(Boolean) || [];
  if (!topics.length) return task.name;
  return topics[Math.floor(Math.random() * topics.length)];
}

export function nextRunLabel(task: AutoTask, lang: 'ru' | 'en' = 'ru'): string {
  const time = task.schedule?.time || '10:00';
  if (task.scheduledDates?.length) {
    const upcoming = [...task.scheduledDates].sort();
    const next = upcoming.find(d => parseLocalDateTime(d, time) > Date.now()) || upcoming[upcoming.length - 1];
    return `${next} ${time}`;
  }
  const dow = DOW[new Date().getDay()];
  const days = task.schedule?.days || [];
  if (!days.length || days.includes(dow)) {
    return lang === 'ru' ? `сегодня ${time}` : `today ${time}`;
  }
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const idx = order.indexOf(dow);
  for (let i = 1; i <= 7; i++) {
    const d = order[(idx + i) % 7];
    if (days.includes(d)) return `${d} ${time}`;
  }
  return `${time}`;
}
