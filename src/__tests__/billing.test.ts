import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordPayment,
  recordCharge,
  loadBillingHistory,
  billingTotals,
  deriveChargesFromEvents,
  loadLocalCharges,
} from '../services/billingHistory';
import { saveCampaignsLocal, trackImpression, type AdCampaign } from '../services/ads';

function campaign(over: Partial<AdCampaign> = {}): AdCampaign {
  return {
    id: 'bc1',
    title: 'Billing camp',
    position: 'hero',
    type: 'views',
    paymentModel: 'cpm',
    pricePerDay: 1000,
    link: 'https://x.test',
    active: true,
    impressions: 0,
    clicks: 0,
    status: 'active',
    budgetTotal: 10000,
    budgetDaily: 10000,
    budgetSpent: 0,
    ...over,
  };
}

describe('billing history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records top-up and charge, computes balance', async () => {
    recordPayment({ amount: 1000, description: 'Top-up', method: 'demo' });
    recordCharge({ amount: 250, campaignId: 'bc1', campaignTitle: 'Billing camp', method: 'cpm' });
    const list = await loadBillingHistory();
    expect(list.length).toBeGreaterThanOrEqual(2);
    const t = billingTotals(list);
    expect(t.toppedUp).toBeCloseTo(1000);
    expect(t.spent).toBeCloseTo(250);
    expect(t.balance).toBeCloseTo(750);
  });

  it('derives charges from ad events', async () => {
    saveCampaignsLocal([campaign()]);
    trackImpression('bc1', 'hero');
    trackImpression('bc1', 'hero');
    const derived = deriveChargesFromEvents();
    expect(derived.length).toBeGreaterThan(0);
    expect(derived[0].amount).toBeLessThan(0);
    expect(derived[0].campaignId).toBe('bc1');
  });

  it('loadBillingHistory merges local payments without supabase', async () => {
    recordPayment({ amount: 100, description: 'A', method: 'demo' });
    recordCharge({ amount: 10, campaignId: 'x', method: 'cpc' });
    const list = await loadBillingHistory();
    expect(list.some(e => e.kind === 'payment')).toBe(true);
    expect(list.some(e => e.kind === 'charge')).toBe(true);
    expect(loadLocalCharges().length).toBeGreaterThanOrEqual(1);
  });
});
