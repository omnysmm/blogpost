// Analytics Service — tracking and reporting

export interface AnalyticsEvent {
  userId: string;
  postId?: string;
  network?: string;
  type: 'view' | 'like' | 'share' | 'click';
}

// ═══ Track Event ═══
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: event.userId,
        post_id: event.postId,
        network: event.network,
        views: event.type === 'view' ? 1 : 0,
        likes: event.type === 'like' ? 1 : 0,
        shares: event.type === 'share' ? 1 : 0,
        date: new Date().toISOString().split('T')[0],
      }),
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
}

// ═══ Get User Analytics ═══
export async function getUserAnalytics(userId: string, days: number = 30): Promise<{
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalPublications: number;
  byNetwork: Record<string, { views: number; likes: number; shares: number; publications: number }>;
  daily: Array<{ date: string; views: number; likes: number; shares: number; publications: number }>;
}> {
  const empty = emptyAnalytics(days);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Local analytics first (offline + merge source)
  const localRows = loadLocalAnalytics(userId);

  let remoteRows: any[] = [];
  if (supabaseUrl) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      const response = await fetch(
        `${supabaseUrl}/rest/v1/analytics?user_id=eq.${userId}&date=gte.${startStr}&select=network,views,likes,shares,publications,date`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (response.ok) remoteRows = await response.json();
    } catch (e) {
      console.error('getUserAnalytics remote failed:', e);
    }
  }

  // Prefer remote over local for same date|network
  const map = new Map<string, any>();
  const key = (r: any) => `${r.date}|${r.network || ''}`;
  for (const r of [...localRows, ...remoteRows]) {
    const k = key(r);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, {
        date: r.date,
        network: r.network || '',
        views: r.views || 0,
        likes: r.likes || 0,
        shares: r.shares || 0,
        publications: r.publications || 0,
      });
    } else {
      map.set(k, {
        ...prev,
        views: Math.max(prev.views, r.views || 0),
        likes: Math.max(prev.likes, r.likes || 0),
        shares: Math.max(prev.shares, r.shares || 0),
        publications: (prev.publications || 0) + (r.publications || 0),
      });
    }
  }

  const data = [...map.values()];
  if (data.length === 0) return empty;

  const totalViews = data.reduce((s, r) => s + r.views, 0);
  const totalLikes = data.reduce((s, r) => s + r.likes, 0);
  const totalShares = data.reduce((s, r) => s + r.shares, 0);
  const totalPublications = data.reduce((s, r) => s + r.publications, 0);

  const byNetwork: Record<string, { views: number; likes: number; shares: number; publications: number }> = {};
  for (const r of data) {
    const net = r.network || 'other';
    if (!byNetwork[net]) byNetwork[net] = { views: 0, likes: 0, shares: 0, publications: 0 };
    byNetwork[net].views += r.views;
    byNetwork[net].likes += r.likes;
    byNetwork[net].shares += r.shares;
    byNetwork[net].publications += r.publications;
  }

  const dailyMap: Record<string, { views: number; likes: number; shares: number; publications: number }> = {};
  for (const r of data) {
    if (!dailyMap[r.date]) dailyMap[r.date] = { views: 0, likes: 0, shares: 0, publications: 0 };
    dailyMap[r.date].views += r.views;
    dailyMap[r.date].likes += r.likes;
    dailyMap[r.date].shares += r.shares;
    dailyMap[r.date].publications += r.publications;
  }

  const daily = Object.entries(dailyMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalViews, totalLikes, totalShares, totalPublications, byNetwork, daily };
}

// ═══ Local fallback (no fake numbers — zeros when no data) ═══
function loadLocalAnalytics(userId: string): any[] {
  try {
    const raw = localStorage.getItem(`blogpost_analytics_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function emptyAnalytics(days: number) {
  const daily: Array<{ date: string; views: number; likes: number; shares: number; publications: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    daily.push({
      date: date.toISOString().split('T')[0],
      views: 0,
      likes: 0,
      shares: 0,
      publications: 0,
    });
  }
  return {
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    totalPublications: 0,
    byNetwork: {},
    daily,
  };
}

/** Increment local + remote analytics counters. */
export async function recordAnalytics(
  userId: string,
  network: string,
  delta: { views?: number; likes?: number; shares?: number; publications?: number },
  postId?: string
): Promise<void> {
  const date = new Date().toISOString().split('T')[0];

  try {
    const raw = localStorage.getItem(`blogpost_analytics_${userId}`);
    const rows: any[] = raw ? JSON.parse(raw) : [];
    let row = rows.find((r) => r.date === date && r.network === network);
    if (!row) {
      row = { date, network, views: 0, likes: 0, shares: 0, publications: 0 };
      rows.push(row);
    }
    row.views += delta.views || 0;
    row.likes += delta.likes || 0;
    row.shares += delta.shares || 0;
    row.publications += delta.publications || 0;
    localStorage.setItem(`blogpost_analytics_${userId}`, JSON.stringify(rows));
  } catch {}

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        post_id: postId,
        network,
        date,
        views: delta.views || 0,
        likes: delta.likes || 0,
        shares: delta.shares || 0,
        publications: delta.publications || 0,
      }),
    });
  } catch (e) {
    console.error('recordAnalytics remote failed:', e);
  }
}

// ═══ Export Analytics ═══
export function exportToCSV(data: Array<Record<string, any>>): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => row[h]).join(','));
  return [headers.join(','), ...rows].join('\n');
}

/** Trigger browser download of CSV. */
export function downloadCSV(filename: string, data: Array<Record<string, any>>): void {
  const csv = exportToCSV(data);
  if (!csv) return;
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
