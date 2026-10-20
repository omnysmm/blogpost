import { describe, it, expect, beforeEach } from 'vitest';
import {
  autoModerateAd,
  billEvent,
  calculateEventCost,
  selectAdForPosition,
  trackImpression,
  trackClick,
  computeAdAnalytics,
  loadCampaignsLocal,
  saveCampaignsLocal,
  upsertCampaign,
  runAdMaintenance,
  isRunnable,
  campaignStats,
  type AdCampaign,
} from '../services/ads';

function campaign(over: Partial<AdCampaign> = {}): AdCampaign {
  return {
    id: 'c1',
    title: 'Valid ad title',
    position: 'hero',
    type: 'views',
    paymentModel: 'cpm',
    pricePerDay: 1000,
    link: 'https://example.com',
    active: true,
    impressions: 0,
    clicks: 0,
    status: 'active',
    budgetTotal: 1000,
    budgetDaily: 500,
    budgetSpent: 0,
    ...over,
  };
}

describe('ads auto-moderation', () => {
  it('approves clean ads', () => {
    const r = autoModerateAd(campaign());
    expect(r.ok).toBe(true);
    expect(r.status).toBe('active');
  });

  it('rejects blocked words', () => {
    const r = autoModerateAd(campaign({ title: 'Лучшее казино онлайн' }));
    expect(r.ok).toBe(false);
    expect(r.status).toBe('rejected');
  });

  it('flags short titles for manual review', () => {
    const r = autoModerateAd(campaign({ title: 'ab' }));
    expect(r.ok).toBe(false);
    expect(r.status).toBe('moderating');
  });

  it('requires http(s) links', () => {
    const r = autoModerateAd(campaign({ link: 'javascript:alert(1)' }));
    expect(r.ok).toBe(false);
    expect(r.note).toContain('http');
  });
});

describe('ads billing', () => {
  it('charges CPM per impression and CPC per click', () => {
    expect(calculateEventCost('cpm', 'impression')).toBeCloseTo(0.25);
    expect(calculateEventCost('cpm', 'click')).toBe(0);
    expect(calculateEventCost('cpc', 'click')).toBe(25);
    expect(calculateEventCost('cpc', 'impression')).toBe(0);
  });

  it('stops spending when total budget is exhausted', () => {
    const c = campaign({ budgetTotal: 0.2, budgetSpent: 0.15, budgetDaily: 100, paymentModel: 'cpm' });
    const first = billEvent(c, 'impression');
    expect(first?.budgetSpent).toBeGreaterThan(0.15);
    const next = billEvent({ ...c, budgetSpent: 0.2 }, 'impression');
    expect(next?.status).toBe('finished');
  });

  it('pauses when daily cap is hit', () => {
    const c = campaign({ paymentModel: 'cpc', budgetTotal: 10000, budgetSpent: 0, budgetDaily: 25, spendToday: 25 });
    const r = billEvent(c, 'click');
    expect(r?.status).toBe('paused');
    expect(r?.cost).toBe(0);
  });
});

describe('ads serving + tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('selects runnable ad for position', () => {
    saveCampaignsLocal([
      campaign({ id: 'a', position: 'hero', budgetTotal: 100, budgetSpent: 0 }),
      campaign({ id: 'b', position: 'hero', budgetTotal: 10, budgetSpent: 10, status: 'finished' }),
      campaign({ id: 'c', position: 'footer', budgetTotal: 50, budgetSpent: 0 }),
    ]);
    const ad = selectAdForPosition('hero');
    expect(ad?.id).toBe('a');
    expect(selectAdForPosition('inline')).toBeNull();
  });

  it('tracks impression and click into analytics', async () => {
    await upsertCampaign({ id: 't1', title: 'Track me', position: 'hero', budgetTotal: 5000, budgetDaily: 5000, link: 'https://x.test' });
    trackImpression('t1', 'hero');
    trackImpression('t1', 'hero');
    trackClick('t1', 'hero');
    const list = loadCampaignsLocal();
    const c = list.find(x => x.id === 't1')!;
    expect(c.impressions).toBe(2);
    expect(c.clicks).toBe(1);
    expect(c.budgetSpent).toBeGreaterThan(0);
    const rows = computeAdAnalytics('t1');
    expect(rows.some(r => r.impressions >= 2 && r.clicks >= 1)).toBe(true);
    const stats = campaignStats(c);
    expect(stats.ctr).toBeCloseTo(50);
  });

  it('maintenance resets daily counters', () => {
    const c = campaign({
      id: 'm1',
      lastBillingAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      spendToday: 999,
      viewsToday: 999,
    });
    saveCampaignsLocal([c]);
    const r = runAdMaintenance();
    expect(r.reset).toBe(1);
    const after = loadCampaignsLocal()[0];
    expect(after.spendToday).toBe(0);
  });

  it('isRunnable rejects empty budget', () => {
    expect(isRunnable(campaign({ budgetTotal: 10, budgetSpent: 10 }))).toBe(false);
    expect(isRunnable(campaign())).toBe(true);
  });
});
