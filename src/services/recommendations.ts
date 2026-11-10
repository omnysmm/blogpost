// Data-driven optimization recommendations + AI summary.
// Rules are computed from real analytics/posts — no hardcoded fake metrics.
import { generateText } from './ai';
import type { Analytics, Post } from '../store/types';

export type RecommendationType = 'content' | 'seo' | 'timing' | 'engagement' | 'publications' | 'network';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  metric: string;
}

interface NetworkTotals {
  network: string;
  views: number;
  likes: number;
  shares: number;
  publications: number;
}

function sumByNetwork(rows: Analytics[]): NetworkTotals[] {
  const map = new Map<string, NetworkTotals>();
  for (const r of rows) {
    const key = r.network || 'unknown';
    const cur = map.get(key) || { network: key, views: 0, likes: 0, shares: 0, publications: 0 };
    cur.views += r.views || 0;
    cur.likes += r.likes || 0;
    cur.shares += r.shares || 0;
    cur.publications += r.publications || 0;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.views - a.views);
}

const NETWORK_LABELS: Record<string, { ru: string; en: string }> = {
  vk: { ru: 'VK', en: 'VK' },
  telegram: { ru: 'Telegram', en: 'Telegram' },
  youtube: { ru: 'YouTube', en: 'YouTube' },
  instagram: { ru: 'Instagram', en: 'Instagram' },
  tiktok: { ru: 'TikTok', en: 'TikTok' },
  ok: { ru: 'ОК', en: 'OK' },
  rutube: { ru: 'Rutube', en: 'Rutube' },
};

function label(network: string, lang: 'ru' | 'en'): string {
  return NETWORK_LABELS[network]?.[lang] || network;
}

/** Compute rule-based recommendations from real analytics + posts. */
export function buildRecommendations(
  analytics: Analytics[],
  posts: Post[],
  lang: 'ru' | 'en' = 'ru',
  periodDays = 30
): Recommendation[] {
  const out: Recommendation[] = [];
  const ru = lang === 'ru';
  const nets = sumByNetwork(analytics);
  const totalViews = nets.reduce((s, n) => s + n.views, 0);
  const totalLikes = nets.reduce((s, n) => s + n.likes, 0);
  const totalShares = nets.reduce((s, n) => s + n.shares, 0);
  const totalPublications = nets.reduce((s, n) => s + n.publications, 0);
  const engagementRate = totalViews > 0 ? ((totalLikes + totalShares) / totalViews) * 100 : 0;

  // 1. Network focus — scale the winner, fix the laggard
  if (nets.length >= 2) {
    const best = nets[0];
    const worst = nets[nets.length - 1];
    const bestShare = totalViews > 0 ? Math.round((best.views / totalViews) * 100) : 0;
    if (best.views > 0 && bestShare >= 35) {
      out.push({
        id: 'net-focus',
        type: 'network',
        priority: 'high',
        title: ru ? `Усильте ${label(best.network, lang)}` : `Double down on ${label(best.network, lang)}`,
        description: ru
          ? `${label(best.network, lang)} даёт ${bestShare}% всех просмотров (${best.views.toLocaleString()}). Планируйте больше публикаций именно там — это самая эффективная площадка в вашем миксе.`
          : `${label(best.network, lang)} delivers ${bestShare}% of all views (${best.views.toLocaleString()}). Plan more posts there — it's the most efficient channel in your mix.`,
        impact: `${best.views.toLocaleString()} ${ru ? 'просмотров' : 'views'}`,
        metric: 'views',
      });
    }
    if (worst.views < best.views * 0.15 && worst.publications > 0) {
      out.push({
        id: 'net-fix',
        type: 'network',
        priority: 'medium',
        title: ru ? `Пересмотрите стратегию в ${label(worst.network, lang)}` : `Rethink your ${label(worst.network, lang)} strategy`,
        description: ru
          ? `${label(worst.network, lang)}: ${worst.publications} публикаций дали всего ${worst.views.toLocaleString()} просмотров. Проверьте формат и время выхода — или перераспределите усилия на более результативные площадки.`
          : `${label(worst.network, lang)}: ${worst.publications} posts produced only ${worst.views.toLocaleString()} views. Check format and timing — or reallocate effort to better-performing channels.`,
        impact: ru ? 'перераспределение бюджета' : 'budget reallocation',
        metric: 'reach',
      });
    }
  }

  // 2. Publication cadence
  const perWeek = totalPublications / Math.max(1, periodDays / 7);
  if (totalPublications > 0 && perWeek < 5) {
    out.push({
      id: 'cadence-up',
      type: 'publications',
      priority: perWeek < 2 ? 'high' : 'medium',
      title: ru ? 'Увеличьте частоту публикаций' : 'Increase publication frequency',
      description: ru
        ? `У вас ${totalPublications} публикаций за период — это ${perWeek.toFixed(1)} в неделю. Регулярный выход минимум 5 раз в неделю стабилизирует охваты и удерживает аудиторию.`
        : `You published ${totalPublications} posts in this period — ${perWeek.toFixed(1)} per week. A steady rhythm of at least 5 per week stabilizes reach and retains the audience.`,
      impact: ru ? `сейчас ${perWeek.toFixed(1)}/нед` : `currently ${perWeek.toFixed(1)}/wk`,
      metric: 'publications',
    });
  } else if (perWeek > 14) {
    out.push({
      id: 'cadence-quality',
      type: 'content',
      priority: 'medium',
      title: ru ? 'Сделайте акцент на качестве' : 'Focus on quality over quantity',
      description: ru
        ? `${perWeek.toFixed(0)} публикаций в неделю — высокий темп. Проверьте, не размывает ли частота вовлечённость (сейчас ${engagementRate.toFixed(1)}%).`
        : `${perWeek.toFixed(0)} posts per week is a high pace. Check whether frequency dilutes engagement (currently ${engagementRate.toFixed(1)}%).`,
      impact: `${engagementRate.toFixed(1)}%`,
      metric: 'engagement',
    });
  }

  // 3. Engagement health
  if (totalViews > 0) {
    if (engagementRate < 2) {
      out.push({
        id: 'engage-low',
        type: 'engagement',
        priority: 'high',
        title: ru ? 'Низкая вовлечённость' : 'Low engagement rate',
        description: ru
          ? `Лайки и репосты составляют ${engagementRate.toFixed(1)}% от просмотров. Добавляйте вопросы и призывы к действию в посты, отвечайте на комментарии в первый час после публикации.`
          : `Likes and shares are ${engagementRate.toFixed(1)}% of views. Add questions and calls-to-action to posts, and reply to comments within the first hour.`,
        impact: ru ? 'цель: 3–5%' : 'target: 3–5%',
        metric: 'engagement',
      });
    } else if (engagementRate > 8) {
      out.push({
        id: 'engage-high',
        type: 'engagement',
        priority: 'low',
        title: ru ? 'Аудитория высоко вовлечена' : 'Audience is highly engaged',
        description: ru
          ? `Вовлечённость ${engagementRate.toFixed(1)}% — значительно выше среднего. Используйте это: запускайте опросы, UGC-акции и коллаборации, чтобы конвертировать активность в рост подписчиков.`
          : `Engagement is ${engagementRate.toFixed(1)}% — well above average. Leverage it: run polls, UGC campaigns and collaborations to convert activity into follower growth.`,
        impact: `${engagementRate.toFixed(1)}%`,
        metric: 'engagement',
      });
    }
  }

  // 4. Content mix from real posts
  const typeCounts = { post: 0, article: 0, video: 0, music: 0 } as Record<string, number>;
  for (const p of posts) typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
  const totalPosts = posts.length;
  if (totalPosts >= 5) {
    const videoShare = (typeCounts.video / totalPosts) * 100;
    if (videoShare < 15) {
      out.push({
        id: 'mix-video',
        type: 'content',
        priority: 'medium',
        title: ru ? 'Добавьте видеоконтент' : 'Add video content',
        description: ru
          ? `Всего ${Math.round(videoShare)}% ваших публикаций — видео (${typeCounts.video} из ${totalPosts}). Видеоформат обычно даёт более высокий органический охват в соцсетях.`
          : `Only ${Math.round(videoShare)}% of your posts are video (${typeCounts.video} of ${totalPosts}). Video typically gets higher organic reach on social platforms.`,
        impact: ru ? `${typeCounts.video}/${totalPosts} видео` : `${typeCounts.video}/${totalPosts} videos`,
        metric: 'views',
      });
    }
    const articleShare = (typeCounts.article / totalPosts) * 100;
    if (articleShare < 10 && typeCounts.post > totalPosts * 0.7) {
      out.push({
        id: 'mix-articles',
        type: 'content',
        priority: 'low',
        title: ru ? 'Разнообразьте форматы' : 'Diversify content formats',
        description: ru
          ? `${Math.round((typeCounts.post / totalPosts) * 100)}% контента — короткие посты. Добавьте статьи и длинные материалы: они усиливают экспертность и улучшают SEO-видимость.`
          : `${Math.round((typeCounts.post / totalPosts) * 100)}% of content is short posts. Add articles and long-form pieces: they build authority and improve SEO visibility.`,
        impact: ru ? 'SEO и экспертиза' : 'SEO & authority',
        metric: 'reach',
      });
    }
  } else if (totalPosts > 0) {
    out.push({
      id: 'mix-needs-data',
      type: 'content',
      priority: 'low',
      title: ru ? 'Соберите больше данных' : 'Collect more data',
      description: ru
        ? `У вас пока только ${totalPosts} публикаций. После 10–15 публикаций рекомендации по типам контента станут точнее.`
        : `You only have ${totalPosts} posts so far. After 10–15 publications, content-type recommendations become more precise.`,
      impact: ru ? 'точность рекомендаций' : 'recommendation accuracy',
      metric: 'publications',
    });
  }

  // 5. Shareability
  if (totalViews > 0 && totalShares > 0 && totalShares / totalViews < 0.005) {
    out.push({
      id: 'shares-low',
      type: 'seo',
      priority: 'medium',
      title: ru ? 'Контент мало репостят' : 'Content is rarely shared',
      description: ru
        ? `Репосты — всего ${((totalShares / totalViews) * 100).toFixed(2)}% от просмотров. Добавляйте инфографику, списки и провокационные вопросы — такой формат чаще делятся.`
        : `Shares are only ${((totalShares / totalViews) * 100).toFixed(2)}% of views. Add infographics, lists and provocative questions — that format gets shared more often.`,
      impact: `${totalShares.toLocaleString()} ${ru ? 'репостов' : 'shares'}`,
      metric: 'shares',
    });
  }

  if (out.length === 0) {
    out.push({
      id: 'all-good',
      type: 'engagement',
      priority: 'low',
      title: ru ? 'Показатели в норме' : 'Metrics look healthy',
      description: ru
        ? 'Существенных отклонений по текущим данным не обнаружено. Продолжайте в том же темпе и следите за динамикой.'
        : 'No significant issues detected in the current data. Keep up the pace and monitor the trend.',
      impact: ru ? 'стабильно' : 'stable',
      metric: 'engagement',
    });
  }

  return out;
}

/** Aggregated stats summary used as AI context. */
export function describeStats(analytics: Analytics[], posts: Post[], lang: 'ru' | 'en'): string {
  const nets = sumByNetwork(analytics);
  const totalViews = nets.reduce((s, n) => s + n.views, 0);
  const totalLikes = nets.reduce((s, n) => s + n.likes, 0);
  const totalShares = nets.reduce((s, n) => s + n.shares, 0);
  const totalPubs = nets.reduce((s, n) => s + n.publications, 0);
  const lines = nets.map(n =>
    `${label(n.network, lang)}: ${n.views} views, ${n.likes} likes, ${n.shares} shares, ${n.publications} posts`
  );
  return [
    `Total: ${totalPubs} posts, ${totalViews} views, ${totalLikes} likes, ${totalShares} shares.`,
    `Per network: ${lines.join('; ')}.`,
    `Posts by type: ${['post', 'article', 'video', 'music'].map(t => `${t}=${posts.filter(p => p.type === t).length}`).join(', ')}.`,
  ].join(' ');
}

/** Ask the AI for an optimization summary based on real stats. */
export async function generateAiRecommendations(
  analytics: Analytics[],
  posts: Post[],
  lang: 'ru' | 'en' = 'ru'
): Promise<string> {
  const stats = describeStats(analytics, posts, lang);
  const prompt = lang === 'ru'
    ? `Вот реальная статистика блогера: ${stats}\n\nДай 3–5 конкретных рекомендаций по оптимизации контент-стратегии. Для каждой: что сделать и почему. Опирайся только на приведённые цифры, ничего не выдумывай. Без вводных фраз, максимум 600 символов.`
    : `Here are a blogger's real stats: ${stats}\n\nGive 3–5 specific recommendations for optimizing the content strategy. For each: what to do and why. Base them strictly on the numbers above, invent nothing. No intro phrases, max 600 characters.`;
  return generateText({ prompt, language: lang, maxLength: 700, raw: true });
}
