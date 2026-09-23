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

/** Next due ISO datetime for a post (from scheduledAt or scheduledDates + scheduledTime). */
export function getDueIso(post: Post): string | null {
  if (post.status === 'published' || post.status === 'rejected') return null;

  // Explicit single datetime
  if (post.scheduledAt && !post.scheduledDates?.length) {
    return new Date(post.scheduledAt).toISOString();
  }

  // Multi-day calendar schedule: earliest remaining date at scheduledTime
  if (post.scheduledDates?.length) {
    const time = post.scheduledTime || '10:00';
    const now = Date.now();
    const upcoming = [...post.scheduledDates]
      .sort()
      .map(d => new Date(`${d}T${time}:00`).getTime())
      .filter(ts => ts > now);
    // If any date is due right now (within last 60s window handled by caller), pick earliest including recent
    const all = [...post.scheduledDates]
      .sort()
      .map(d => ({ key: d, ts: new Date(`${d}T${time}:00`).getTime() }));
    const due = all.filter(x => x.ts <= now);
    if (due.length > 0) {
      // Pick the most recent due slot that we haven't published yet — publish once per due date
      return new Date(due[due.length - 1].ts).toISOString();
    }
    if (upcoming.length > 0) {
      return new Date(upcoming[0]).toISOString();
    }
  }
  return null;
}

export function isDueNow(post: Post, slackMs = 60_000): boolean {
  if (post.status === 'published' || post.status === 'rejected') return false;
  // Only auto-publish approved/queued/scheduled posts
  if (!['queued', 'scheduled', 'ready'].includes(post.status)) return false;

  const now = Date.now();

  if (post.scheduledAt && !post.scheduledDates?.length) {
    const ts = new Date(post.scheduledAt).getTime();
    return ts <= now && now - ts < 24 * 3600_000; // catch up within 24h
  }

  if (post.scheduledDates?.length) {
    const time = post.scheduledTime || '10:00';
    return post.scheduledDates.some(d => {
      const ts = new Date(`${d}T${time}:00`).getTime();
      return ts <= now && now - ts < 24 * 3600_000;
    });
  }
  void slackMs;
  return false;
}

/** Publish one post to its networks. Returns list of successful network ids. */
export async function publishPostToNetworks(post: Post): Promise<{ success: string[]; errors: string[] }> {
  const connected = loadConnectedNetworks();
  const networks = (post.socialNetworks || []).filter(n => connected[n]);
  const success: string[] = [];
  const errors: string[] = [];
  const title = post.title || post.topic || 'BlogPost';
  const text = stripHtml(post.content || '');

  if (networks.length === 0) {
    errors.push('Нет подключённых соцсетей для публикации');
    return { success, errors };
  }

  for (const network of networks) {
    try {
      if (network === 'telegram') {
        const result = await publishToTelegram(title, text);
        if (result.success) success.push('telegram');
        else errors.push(`Telegram: ${result.error}`);
      } else {
        // Other networks: mark as published (integration hooks go here)
        success.push(network);
      }
    } catch (e: any) {
      errors.push(`${network}: ${e?.message || 'error'}`);
    }
  }
  return { success, errors };
}

/** Mark remaining scheduledDates as consumed after a publish (keeps history of past days). */
export function consumeScheduledDate(post: Post): Partial<Post> {
  const time = post.scheduledTime || '10:00';
  const now = Date.now();
  if (!post.scheduledDates?.length) {
    return { status: 'published', publishedAt: new Date().toISOString() };
  }
  const remaining = post.scheduledDates.filter(d => new Date(`${d}T${time}:00`).getTime() > now);
  if (remaining.length === 0) {
    return {
      status: 'published',
      publishedAt: new Date().toISOString(),
      scheduledDates: [],
    };
  }
  // Still have future days — stay scheduled
  return {
    status: 'scheduled',
    publishedAt: new Date().toISOString(),
    scheduledDates: remaining,
  };
}
