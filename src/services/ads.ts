// Advertising platform: selection, impression/click tracking, billing, auto-moderation
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AdBlock } from '../store/types';

export type AdPosition = 'hero' | 'sidebar' | 'inline' | 'footer';
export type AdPaymentModel = 'cpm' | 'cpc' | 'cpd' | 'banner';
export type AdStatus = 'draft' | 'pending' | 'moderating' | 'active' | 'paused' | 'rejected' | 'finished';

export interface AdCampaign extends AdBlock {
  userId?: string;
  status: AdStatus;
  budgetTotal: number;
  budgetDaily: number;
  budgetSpent: number;
  paymentModel: AdPaymentModel;
  description?: string;
  imageUrl?: string;
  mediaUrl?: string;
  startDate?: string;
  endDate?: string;
  moderationNote?: string;
  viewsToday?: number;
  spendToday?: number;
  lastBillingAt?: string;
}

export interface AdAnalyticsPoint {
  date: string;
  position: AdPosition | string;
  impressions: number;
  clicks: number;
  spend: number;
}

const CAMPAIGNS_KEY = 'blogpost_ad_campaigns';
const EVENTS_KEY = 'blogpost_ad_events';
const DAY_MS = 86_400_000;

/** CPM is per 1000 impressions. */
export const AD_RATES: Record<AdPaymentModel, number> = {
  cpm: 250, // ₽ / 1000 shows
  cpc: 25, // ₽ / click
  cpd: 3000, // ₽ / day
  banner: 0, // flat via pricePerDay
};

// ═══ Storage helpers ═══

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seed demo inventory once so placements work out of the box. */
export function seedDefaultCampaigns(): void {
  const existing = loadCampaignsLocal();
  if (existing.length) return;
  const demo: AdCampaign[] = [
    {
      id: 'ad_seed_hero',
      title: 'BlogPost Premium — AI без лимитов',
      description: 'Генерация текстов, фото и публикации в 7 соцсетей. Первые 48 часов бесплатно.',
      position: 'hero',
      type: 'banner',
      paymentModel: 'cpm',
      pricePerDay: 50000,
      link: '#pricing',
      active: true,
      status: 'active',
      impressions: 0,
      clicks: 0,
      budgetTotal: 50000,
      budgetDaily: 5000,
      budgetSpent: 0,
    },
    {
      id: 'ad_seed_sidebar',
      title: 'Подключите Telegram-бота',
      description: 'Автопостинг по расписанию за 2 минуты.',
      position: 'sidebar',
      type: 'clicks',
      paymentModel: 'cpc',
      pricePerDay: 5000,
      link: '#',
      active: true,
      status: 'active',
      impressions: 0,
      clicks: 0,
      budgetTotal: 15000,
      budgetDaily: 1500,
      budgetSpent: 0,
    },
    {
      id: 'ad_seed_inline',
      title: 'Аналитика соцсетей в одном дашборде',
      description: 'Показы, лайки, публикации — без Excel.',
      position: 'inline',
      type: 'views',
      paymentModel: 'cpm',
      pricePerDay: 3000,
      link: '#',
      active: true,
      status: 'active',
      impressions: 0,
      clicks: 0,
      budgetTotal: 10000,
      budgetDaily: 1000,
      budgetSpent: 0,
    },
    {
      id: 'ad_seed_footer',
      title: 'Реклама в BlogPost — 18 000+ блогеров',
      description: 'CPM/CPC/CPD. Модерация за 15 минут.',
      position: 'footer',
      type: 'banner',
      paymentModel: 'cpd',
      pricePerDay: 10000,
      link: '#',
      active: true,
      status: 'active',
      impressions: 0,
      clicks: 0,
      budgetTotal: 30000,
      budgetDaily: 3000,
      budgetSpent: 0,
    },
  ];
  saveCampaignsLocal(demo);
}

export function loadCampaignsLocal(): AdCampaign[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveCampaignsLocal(list: AdCampaign[]): void {
  try {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('saveCampaignsLocal', e);
  }
}

type AdEvent = {
  id: string;
  campaignId: string;
  kind: 'impression' | 'click';
  date: string;
  position: string;
  ts: number;
  cost?: number;
};

function loadEvents(): AdEvent[] {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function listAdEvents(): AdEvent[] {
  return loadEvents();
}

function saveEvents(events: AdEvent[]): void {
  try {
    // cap history at 5000 local events
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-5000)));
  } catch {}
}

function logEvent(campaignId: string, kind: 'impression' | 'click', position: string, cost = 0) {
  const events = loadEvents();
  events.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    campaignId,
    kind,
    date: today(),
    position,
    ts: Date.now(),
    cost,
  });
  saveEvents(events);
}

// ═══ Auto-moderation ═══

const BLOCKED_WORDS_RU = [
  'казино', 'ставки', 'bet', 'casino', 'наркот', 'оружи', 'viagra', 'viagro',
  'детское порно', 'наркотики', 'взлом', 'crack', 'hack', 'краден',
];

export interface ModerationResult {
  ok: boolean;
  status: AdStatus;
  note: string;
  score: number; // 0..100 risk
}

export function autoModerateAd(ad: Partial<AdCampaign>): ModerationResult {
  const issues: string[] = [];
  let risk = 0;

  const title = (ad.title || '').trim();
  const desc = (ad.description || '').trim();
  const link = (ad.link || '').trim();
  const text = `${title} ${desc}`.toLowerCase();

  if (!title || title.length < 3) {
    issues.push('Слишком короткий заголовок (мин. 3 символа)');
    risk += 30;
  }
  if (title.length > 120) {
    issues.push('Заголовок длиннее 120 символов');
    risk += 10;
  }

  for (const w of BLOCKED_WORDS_RU) {
    if (text.includes(w)) {
      issues.push(`Запрещённое слово: «${w}»`);
      risk += 40;
    }
  }

  if (link && !/^https?:\/\//i.test(link)) {
    issues.push('Ссылка должна начинаться с http:// или https://');
    risk += 40;
  }

  if (link && /(\.ru|\.com|\.net)?\/?(login|signin|bank|pay)/i.test(link) && !/^https:\/\//i.test(link)) {
    issues.push('Подозрительная ссылка без HTTPS');
    risk += 20;
  }

  const budget = Number(ad.budgetTotal ?? 0);
  if (budget < 100) {
    issues.push('Бюджет кампании меньше 100 ₽');
    risk += 15;
  }

  const position = ad.position || (ad as any).site_position;
  if (position && !['hero', 'sidebar', 'inline', 'footer'].includes(String(position))) {
    issues.push('Неизвестная позиция размещения');
    risk += 15;
  }

  const hasHardBlock = issues.some(
    i => i.includes('Запрещённое') || i.startsWith('Ссылка должна')
  );
  if (hasHardBlock || risk >= 60) {
    return { ok: false, status: 'rejected', note: issues.join('; '), score: risk };
  }
  if (risk >= 30) {
    return { ok: false, status: 'moderating', note: issues.join('; ') || 'Требует ручной проверки', score: risk };
  }
  return {
    ok: true,
    status: 'active',
    note: issues.length ? `Замечания: ${issues.join('; ')}` : 'Проверка пройдена',
    score: risk,
  };
}

// ═══ Billing ═══

export function calculateEventCost(model: AdPaymentModel, kind: 'impression' | 'click'): number {
  if (kind === 'click') {
    return model === 'cpc' || model === 'banner' ? AD_RATES.cpc : 0;
  }
  // impression
  if (model === 'cpm') return AD_RATES.cpm / 1000;
  return 0;
}

export function dailySpendCap(model: AdPaymentModel, campaign?: AdCampaign): number {
  if (campaign?.budgetDaily && campaign.budgetDaily > 0) return campaign.budgetDaily;
  if (model === 'cpd') return AD_RATES.cpd;
  return Infinity;
}

/**
 * Charge one event against the campaign.
 * Returns updated budget fields or null if campaign cannot spend.
 */
export function billEvent(
  campaign: AdCampaign,
  kind: 'impression' | 'click'
): { budgetSpent: number; spendToday: number; status: AdStatus; cost: number } | null {
  const model = campaign.paymentModel || campaign.type || 'cpm';
  const cost = calculateEventCost(model as AdPaymentModel, kind);

  const spent = Number(campaign.budgetSpent || 0);
  const total = Number(campaign.budgetTotal || 0);
  const spendToday = Number(campaign.spendToday || 0);
  const cap = dailySpendCap(model as AdPaymentModel, campaign);

  if (total > 0 && spent + cost > total) {
    return {
      budgetSpent: total,
      spendToday,
      status: 'finished',
      cost: 0,
    };
  }
  if (cap !== Infinity && spendToday + cost > cap) {
    // pause until tomorrow — still record the hit at 0 cost for stats honesty? charge nothing
    return {
      budgetSpent: spent,
      spendToday,
      status: 'paused',
      cost: 0,
    };
  }

  return {
    budgetSpent: spent + cost,
    spendToday: spendToday + cost,
    status: campaign.status === 'paused' ? 'paused' : 'active',
    cost,
  };
}

// ═══ Tracking ═══

export function trackImpression(campaignId: string, position: string = 'unknown'): void {
  const list0 = loadCampaignsLocal();
  const model0 = (list0.find(c => c.id === campaignId)?.paymentModel || 'cpm') as AdPaymentModel;
  logEvent(campaignId, 'impression', position, calculateEventCost(model0, 'impression'));
  const list = loadCampaignsLocal();
  const idx = list.findIndex(c => c.id === campaignId);
  if (idx < 0) return;
  const c = { ...list[idx] };
  c.impressions = Number(c.impressions || 0) + 1;
  c.viewsToday = Number(c.viewsToday || 0) + 1;

  // reset daily counters when date rolled
  if (c.lastBillingAt && c.lastBillingAt.slice(0, 10) !== today()) {
    c.viewsToday = 1;
    c.spendToday = 0;
  }
  c.lastBillingAt = new Date().toISOString();

  const bill = billEvent(c, 'impression');
  if (bill) {
    c.budgetSpent = bill.budgetSpent;
    c.spendToday = bill.spendToday;
    if (bill.status === 'finished' || bill.status === 'paused') c.status = bill.status;
  }

  list[idx] = c;
  saveCampaignsLocal(list);

  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('ad_campaigns').update({
          impressions: c.impressions,
          budget_spent: c.budgetSpent,
          status: c.status,
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId);
      } catch { /* local-only */ }
    })();
  }
}

export function trackClick(campaignId: string, position: string = 'unknown'): void {
  const list0 = loadCampaignsLocal();
  const model0 = (list0.find(c => c.id === campaignId)?.paymentModel || 'cpc') as AdPaymentModel;
  logEvent(campaignId, 'click', position, calculateEventCost(model0, 'click'));
  const list = loadCampaignsLocal();
  const idx = list.findIndex(c => c.id === campaignId);
  if (idx < 0) return;
  const c = { ...list[idx] };
  c.clicks = Number(c.clicks || 0) + 1;

  const bill = billEvent(c, 'click');
  if (bill) {
    c.budgetSpent = bill.budgetSpent;
    c.spendToday = bill.spendToday;
    if (bill.status === 'finished' || bill.status === 'paused') c.status = bill.status;
  }

  list[idx] = c;
  saveCampaignsLocal(list);

  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('ad_campaigns').update({
          clicks: c.clicks,
          budget_spent: c.budgetSpent,
          status: c.status,
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId);
      } catch { /* local-only */ }
    })();
  }
}

// ═══ Selection / serving ═══

export function isRunnable(c: AdCampaign): boolean {
  if (c.status !== 'active' && c.status !== 'paused') return false;
  if (c.status === 'paused') return false;
  const total = Number(c.budgetTotal || 0);
  const spent = Number(c.budgetSpent || 0);
  if (total > 0 && spent >= total) return false;
  const now = Date.now();
  if (c.startDate && new Date(c.startDate).getTime() > now) return false;
  if (c.endDate && new Date(c.endDate).getTime() + DAY_MS < now) return false;
  return true;
}

/** Pick one active ad for a position (weighted by remaining budget). */
export function selectAdForPosition(
  position: AdPosition,
  campaigns: AdCampaign[] = loadCampaignsLocal()
): AdCampaign | null {
  if (!loadCampaignsLocal().length) seedDefaultCampaigns();
  const source = campaigns.length ? campaigns : loadCampaignsLocal();
  const pool = source.filter(c => isRunnable(c) && (c.position || (c as any).site_position) === position);
  if (!pool.length) return null;
  // prefer highest remaining budget
  pool.sort((a, b) => {
    const ra = Number(a.budgetTotal || 0) - Number(a.budgetSpent || 0);
    const rb = Number(b.budgetTotal || 0) - Number(b.budgetSpent || 0);
    return rb - ra;
  });
  return pool[0];
}

export function listRunnableAds(positions?: AdPosition[]): AdCampaign[] {
  return loadCampaignsLocal().filter(c => {
    if (!isRunnable(c)) return false;
    if (!positions?.length) return true;
    return positions.includes((c.position || (c as any).site_position) as AdPosition);
  });
}

// ═══ Analytics ═══

export function computeAdAnalytics(campaignId?: string): AdAnalyticsPoint[] {
  const events = loadEvents().filter(e => !campaignId || e.campaignId === campaignId);
  const map = new Map<string, AdAnalyticsPoint>();
  for (const e of events) {
    const key = `${e.date}|${e.position}`;
    const row = map.get(key) || { date: e.date, position: e.position, impressions: 0, clicks: 0, spend: 0 };
    if (e.kind === 'impression') row.impressions += 1;
    else row.clicks += 1;
    map.set(key, row);
  }
  // attach spend from campaign events costs
  const campaigns = loadCampaignsLocal();
  for (const row of map.values()) {
    const related = campaigns.find(c => (c.position || (c as any).site_position) === row.position);
    if (related) {
      const model = (related.paymentModel || related.type || 'cpm') as AdPaymentModel;
      row.spend =
        row.impressions * calculateEventCost(model, 'impression') +
        row.clicks * calculateEventCost(model, 'click');
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function campaignStats(campaign: AdCampaign) {
  const impressions = Number(campaign.impressions || 0);
  const clicks = Number(campaign.clicks || 0);
  const spent = Number(campaign.budgetSpent || 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spent / clicks : 0;
  return { impressions, clicks, spent, ctr, cpc };
}

// ╀══ Create / update (moderation + persist) ═══

export async function upsertCampaign(input: Partial<AdCampaign>): Promise<AdCampaign> {
  const mod = autoModerateAd(input);
  const id = input.id || `ad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const base: AdCampaign = {
    ...input,
    id,
    title: input.title || 'Реклама',
    position: input.position || 'hero',
    type: input.type || (input.paymentModel as any) || 'banner',
    paymentModel: input.paymentModel || 'cpm',
    pricePerDay: input.pricePerDay ?? AD_RATES.cpd,
    link: input.link || '#',
    active: mod.ok,
    impressions: input.impressions ?? 0,
    clicks: input.clicks ?? 0,
    userId: input.userId,
    status: mod.status,
    budgetTotal: input.budgetTotal ?? 1000,
    budgetDaily: input.budgetDaily ?? 0,
    budgetSpent: input.budgetSpent ?? 0,
    description: input.description,
    imageUrl: input.imageUrl,
    mediaUrl: input.mediaUrl,
    startDate: input.startDate,
    endDate: input.endDate,
    moderationNote: mod.note,
    viewsToday: input.viewsToday ?? 0,
    spendToday: input.spendToday ?? 0,
  };

  const list = loadCampaignsLocal();
  const idx = list.findIndex(c => c.id === base.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...base };
  else list.push(base);
  saveCampaignsLocal(list);

  if (isSupabaseConfigured) {
    try {
      const row = {
        id: base.id,
        user_id: base.userId,
        title: base.title,
        status: base.status,
        format: base.type,
        placement: 'site',
        site_position: base.position,
        payment_model: base.paymentModel,
        budget_total: base.budgetTotal,
        budget_daily: base.budgetDaily,
        budget_spent: base.budgetSpent,
        impressions: base.impressions,
        clicks: base.clicks,
        media_url: base.imageUrl || base.mediaUrl,
        link: base.link,
        description: base.description,
        start_date: base.startDate,
        end_date: base.endDate,
      } as any;
      const { error } = await supabase.from('ad_campaigns').upsert(row);
      if (error) console.warn('campaign upsert', error.message);
    } catch (e) {
      console.warn('campaign upsert failed', e);
    }
  }

  return base;
}

export function removeCampaign(id: string): void {
  saveCampaignsLocal(loadCampaignsLocal().filter(c => c.id !== id));
  if (isSupabaseConfigured) {
    void (async () => {
      try { await supabase.from('ad_campaigns').delete().eq('id', id); } catch { /* ignore */ }
    })();
  }
}

/** Daily budget reset + finish expired campaigns. */
export function runAdMaintenance(now = Date.now()): { reset: number; finished: number } {
  const list = loadCampaignsLocal();
  let reset = 0;
  let finished = 0;
  const day = new Date(now).toISOString().slice(0, 10);
  for (let i = 0; i < list.length; i++) {
    const c = { ...list[i] };
    if (c.lastBillingAt && c.lastBillingAt.slice(0, 10) !== day) {
      c.spendToday = 0;
      c.viewsToday = 0;
      c.lastBillingAt = new Date(now).toISOString();
      if (c.status === 'paused' && isRunnable({ ...c, status: 'active' })) {
        c.status = 'active';
      }
      reset += 1;
    }
    const total = Number(c.budgetTotal || 0);
    if (total > 0 && Number(c.budgetSpent || 0) >= total && c.status !== 'finished') {
      c.status = 'finished';
      c.active = false;
      finished += 1;
    }
    if (c.endDate && new Date(c.endDate).getTime() + DAY_MS < now && c.status !== 'finished') {
      c.status = 'finished';
      c.active = false;
      finished += 1;
    }
    list[i] = c;
  }
  saveCampaignsLocal(list);
  return { reset, finished };
}
