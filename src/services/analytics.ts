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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    return generateMockAnalytics(days);
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];

    const response = await fetch(
      `${supabaseUrl}/rest/v1/analytics?user_id=eq.${userId}&date=gte.${startStr}&select=network,views,likes,shares,publications,date`,
      {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await response.json();

    const totalViews = data.reduce((s: number, r: any) => s + r.views, 0);
    const totalLikes = data.reduce((s: number, r: any) => s + r.likes, 0);
    const totalShares = data.reduce((s: number, r: any) => s + r.shares, 0);
    const totalPublications = data.reduce((s: number, r: any) => s + (r.publications || 0), 0);

    const byNetwork: Record<string, { views: number; likes: number; shares: number; publications: number }> = {};
    data.forEach((r: any) => {
      if (!byNetwork[r.network]) byNetwork[r.network] = { views: 0, likes: 0, shares: 0, publications: 0 };
      byNetwork[r.network].views += r.views;
      byNetwork[r.network].likes += r.likes;
      byNetwork[r.network].shares += r.shares;
      byNetwork[r.network].publications += r.publications || 0;
    });

    const dailyMap: Record<string, { views: number; likes: number; shares: number; publications: number }> = {};
    data.forEach((r: any) => {
      if (!dailyMap[r.date]) dailyMap[r.date] = { views: 0, likes: 0, shares: 0, publications: 0 };
      dailyMap[r.date].views += r.views;
      dailyMap[r.date].likes += r.likes;
      dailyMap[r.date].shares += r.shares;
      dailyMap[r.date].publications += r.publications || 0;
    });

    const daily = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { totalViews, totalLikes, totalShares, totalPublications, byNetwork, daily };
  } catch {
    return generateMockAnalytics(days);
  }
}

// ═══ Mock Analytics ═══
function generateMockAnalytics(days: number) {
  const networks = ['vk', 'telegram', 'youtube', 'instagram', 'tiktok', 'ok', 'rutube'];
  const byNetwork: Record<string, { views: number; likes: number; shares: number; publications: number }> = {};
  const daily: Array<{ date: string; views: number; likes: number; shares: number; publications: number }> = [];
  let totalViews = 0, totalLikes = 0, totalShares = 0, totalPublications = 0;

  networks.forEach(net => {
    const views = Math.floor(Math.random() * 50000) + 1000;
    const likes = Math.floor(views * (Math.random() * 0.1 + 0.02));
    const shares = Math.floor(likes * (Math.random() * 0.3 + 0.1));
    const publications = Math.floor(Math.random() * 30) + 5;
    byNetwork[net] = { views, likes, shares, publications };
    totalViews += views;
    totalLikes += likes;
    totalShares += shares;
    totalPublications += publications;
  });

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const views = Math.floor(Math.random() * 3000) + 500;
    const likes = Math.floor(views * (Math.random() * 0.1 + 0.02));
    const shares = Math.floor(likes * (Math.random() * 0.3 + 0.1));
    const publications = Math.floor(Math.random() * 3);
    daily.push({ date: date.toISOString().split('T')[0], views, likes, shares, publications });
  }

  return { totalViews, totalLikes, totalShares, totalPublications, byNetwork, daily };
}

// ═══ Export Analytics ═══
export function exportToCSV(data: Array<Record<string, any>>): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => row[h]).join(','));
  return [headers.join(','), ...rows].join('\n');
}