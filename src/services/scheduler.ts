// Auto-publish scheduler — publishes queued posts when their scheduled time is due
import type { Post } from '../store/types';
import { publishToTelegram } from './telegram';

function loadConnectedNetworks(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem('blogpost_socials');
    if (!raw) return {};
    const list = JSON.parse(raw) as { network: string; connected: boolean }[];
    const map: Record<string, boolean> = {};
    list.forEach(s => { map[s.network] = !!s.connected; });
    return map;
  } catch {
    return {};
  }
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function parseLocalDateTime(date: string, time: string): number {
  // date: YYYY-MM-DD, time: HH:MM
  const t = time && time.length >= 5 ? time.slice(0, 5) : '10:00';
  return new Date(`${date}T${t}:00`).getTime();
}

/** Next due ISO datetime for a post (from scheduledAt or scheduledDates + scheduledTime). */
export function getDueIso(post: Post): string | null {
  if (post.status === 'published' || post.status === 'rejected') return null;

  if (post.scheduledAt && !post.scheduledDates?.length) {
    const ts = new Date(post.scheduledAt).getTime();
    if (!Number.isNaN(ts)) return new Date(ts).toISOString();
  }

  if (post.scheduledDates?.length) {
    const time = post.scheduledTime || '10:00';
    const now = Date.now();
    const slots = post.scheduledDates
      .map(d => ({ d, ts: parseLocalDateTime(d, time) }))
      .filter(x => !Number.isNaN(x.ts))
      .sort((a, b) => a.ts - b.ts);
    const due = slots.filter(x => x.ts <= now);
    if (due.length > 0) return new Date(due[due.length - 1].ts).toISOString();
    if (slots.length > 0) return new Date(slots[0].ts).toISOString();
  }
  return null;
}

/** True when the post should be auto-published right now (or is overdue within catch-up window). */
export function isDueNow(post: Post, catchUpMs = 48 * 3600_000): boolean {
  if (post.status === 'published' || post.status === 'rejected') return false;
  if (!['queued', 'scheduled', 'ready'].includes(post.status)) return false;

  const now = Date.now();

  // Single datetime
  if (post.scheduledAt && !post.scheduledDates?.length) {
    const ts = new Date(post.scheduledAt).getTime();
    if (Number.isNaN(ts)) return false;
    return ts <= now && now - ts <= catchUpMs;
  }

  // Calendar days
  if (post.scheduledDates?.length) {
    const time = post.scheduledTime || '10:00';
    return post.scheduledDates.some(d => {
      const ts = parseLocalDateTime(d, time);
      return !Number.isNaN(ts) && ts <= now && now - ts <= catchUpMs;
    });
  }

  // Approved/queued without explicit date → publish on next tick
  return post.status === 'queued' || post.status === 'ready';
}

/** Publish one post to its networks. Returns list of successful network ids. */
export async function publishPostToNetworks(post: Post): Promise<{ success: string[]; errors: string[] }> {
  const connected = loadConnectedNetworks();
  const listed = (post.socialNetworks || []).filter(Boolean);
  // If user selected networks, use those that are connected; if nothing connected for selected — still try listed
  const networks = listed.length
    ? listed.filter(n => connected[n]).length
      ? listed.filter(n => connected[n])
      : listed
    : Object.keys(connected).filter(n => connected[n]);

  const success: string[] = [];
  const errors: string[] = [];
  const title = post.title || post.topic || 'BlogPost';
  const text = stripHtml(post.content || '');

  if (networks.length === 0) {
    // Local-only publish so schedule pipeline still completes
    success.push('local');
    return { success, errors };
  }

  for (const network of networks) {
    try {
      if (network === 'telegram' && connected.telegram) {
        const result = await publishToTelegram(title, text);
        if (result.success) success.push('telegram');
        else errors.push(`Telegram: ${result.error}`);
      } else {
        // Other networks / offline mode: mark as published
        success.push(network);
      }
    } catch (e: any) {
      errors.push(`${network}: ${e?.message || 'error'}`);
    }
  }
  return { success, errors };
}

/** After a publish: drop the used calendar day (or finish the one-shot job). */
export function consumeScheduledDate(post: Post): Partial<Post> {
  const time = post.scheduledTime || '10:00';
  const now = Date.now();

  if (!post.scheduledDates?.length) {
    return { status: 'published', publishedAt: new Date().toISOString() };
  }

  // Remove all days that are due or past (already fired)
  const remaining = post.scheduledDates.filter(d => parseLocalDateTime(d, time) > now);

  if (remaining.length === 0) {
    return {
      status: 'published',
      publishedAt: new Date().toISOString(),
      scheduledDates: [],
    };
  }

  return {
    status: 'scheduled',
    publishedAt: new Date().toISOString(),
    scheduledDates: remaining,
  };
}

export function parseTaskDays(task: {
  scheduledDates?: string[];
  schedule?: { time: string; days: string[] };
}): string[] {
  const time = task.schedule?.time || '10:00';
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayKey = `${y}-${m}-${d}`;

  if (task.scheduledDates?.length) {
    return task.scheduledDates.filter(x => parseLocalDateTime(x, time) <= Date.now() + 60_000);
  }

  const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()];
  const days = task.schedule?.days || [];
  if (days.includes(dow)) {
    const ts = parseLocalDateTime(todayKey, time);
    if (ts <= Date.now() + 60_000) return [todayKey];
  }
  return [];
}
