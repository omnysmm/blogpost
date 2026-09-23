// Local persistence for posts and analytics (survives logout/login)
import type { Post, Analytics } from '../store/types';

const postsKey = (userId: string) => `blogpost_posts_${userId}`;
const analyticsKey = (userId: string) => `blogpost_analytics_${userId}`;
const SESSION_USER_KEY = 'blogpost_session_user';
const prefsKey = (userId: string) => `blogpost_generator_prefs_${userId}`;

export interface GeneratorPrefs {
  contentType?: string;
  mode?: 'auto' | 'manual';
  selectedModel?: string;
  generateAudioOpt?: boolean;
  generateVideoOpt?: boolean;
  generateImageOpt?: boolean;
  seoEnabled?: boolean;
  geoEnabled?: boolean;
  moderation?: boolean;
  includeAd?: boolean;
  adPosition?: string;
  selectedNetworks?: string[];
}

export function loadGeneratorPrefs(userId: string): GeneratorPrefs {
  try {
    const raw = localStorage.getItem(prefsKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveGeneratorPrefs(userId: string, prefs: GeneratorPrefs): void {
  try {
    localStorage.setItem(prefsKey(userId), JSON.stringify(prefs));
  } catch (e) {
    console.error('saveGeneratorPrefs failed', e);
  }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed : fallback) as T;
    }
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

// ═══ Session (restore login after refresh) ═══
export function saveSessionUser(user: unknown): void {
  try {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } catch {}
}

export function loadSessionUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearSessionUser(): void {
  try {
    localStorage.removeItem(SESSION_USER_KEY);
  } catch {}
}

// ═══ Posts ═══
export function loadPosts(userId: string): Post[] {
  try {
    return safeParse<Post[]>(localStorage.getItem(postsKey(userId)), []);
  } catch {
    return [];
  }
}

export function savePosts(userId: string, posts: Post[]): void {
  try {
    localStorage.setItem(postsKey(userId), JSON.stringify(posts));
  } catch (e) {
    console.error('savePosts failed:', e);
  }
}

// ═══ Analytics ═══
export function loadAnalytics(userId: string): Analytics[] {
  try {
    const rows = safeParse<Analytics[]>(localStorage.getItem(analyticsKey(userId)), []);
    return rows.map(r => ({ ...r, publications: r.publications || 0 }));
  } catch {
    return [];
  }
}

export function saveAnalytics(userId: string, analytics: Analytics[]): void {
  try {
    localStorage.setItem(analyticsKey(userId), JSON.stringify(analytics));
  } catch (e) {
    console.error('saveAnalytics failed:', e);
  }
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Increment publications counter for network/day and persist. */
export function recordPublication(
  userId: string,
  network: string,
  analytics: Analytics[],
  postId?: string
): Analytics[] {
  const date = todayStr();
  const next = analytics.map(a => ({ ...a }));
  const existing = next.find(a => a.date === date && a.network === network);
  if (existing) {
    existing.publications = (existing.publications || 0) + 1;
  } else {
    next.push({ date, network, views: 0, likes: 0, shares: 0, publications: 1 });
  }
  saveAnalytics(userId, next);
  void postId;
  return next;
}

/** Zero publications counter for a network (all days). */
export function resetNetworkPublications(
  userId: string,
  network: string,
  analytics: Analytics[]
): Analytics[] {
  const next = analytics.map(a =>
    a.network === network ? { ...a, publications: 0 } : a
  );
  saveAnalytics(userId, next);
  return next;
}

/** Zero all analytics for a network (views/likes/shares/publications). */
export function resetNetworkStats(
  userId: string,
  network: string,
  analytics: Analytics[]
): Analytics[] {
  const next = analytics.map(a =>
    a.network === network
      ? { ...a, views: 0, likes: 0, shares: 0, publications: 0 }
      : a
  );
  saveAnalytics(userId, next);
  return next;
}
