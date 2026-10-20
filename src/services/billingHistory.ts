// Billing history for advertisers: top-up payments + ad spend charges
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { listAdEvents, loadCampaignsLocal, calculateEventCost, type AdPaymentModel } from './ads';

export type BillingEntryKind = 'payment' | 'charge' | 'refund' | 'bonus';

export interface BillingEntry {
  id: string;
  kind: BillingEntryKind;
  amount: number; // + top-up, - spend
  currency: string;
  description: string;
  campaignId?: string;
  campaignTitle?: string;
  method?: string; // yookassa / cpm / cpc / cpd
  status: 'succeeded' | 'pending' | 'failed' | 'draft';
  createdAt: string;
}

const PAYMENTS_KEY = 'blogpost_billing_payments';
const CHARGES_KEY = 'blogpost_billing_charges';

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function loadLocalPayments(): BillingEntry[] {
  try {
    return JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalPayments(list: BillingEntry[]): void {
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(list.slice(-500)));
  } catch {}
}

export function loadLocalCharges(): BillingEntry[] {
  try {
    return JSON.parse(localStorage.getItem(CHARGES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalCharges(list: BillingEntry[]): void {
  try {
    localStorage.setItem(CHARGES_KEY, JSON.stringify(list.slice(-2000)));
  } catch {}
}

/** Record a successful top-up (YooKassa or manual). */
export function recordPayment(input: {
  id?: string;
  amount: number;
  description?: string;
  method?: string;
  status?: BillingEntry['status'];
  userId?: string;
}): BillingEntry {
  const entry: BillingEntry = {
    id: input.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: 'payment',
    amount: Math.abs(input.amount),
    currency: 'RUB',
    description: input.description || 'Пополнение баланса',
    method: input.method || 'yookassa',
    status: input.status || 'succeeded',
    createdAt: new Date().toISOString(),
  };
  const list = loadLocalPayments();
  if (!list.some(p => p.id === entry.id)) list.push(entry);
  saveLocalPayments(list);

  if (isSupabaseConfigured && input.userId) {
    void (async () => {
      try {
        await supabase.from('payments').upsert({
          id: entry.id,
          user_id: input.userId,
          amount: entry.amount,
          currency: entry.currency,
          description: entry.description,
          status: entry.status,
          payment_method: entry.method,
          created_at: entry.createdAt,
        } as any);
      } catch { /* offline */ }
    })();
  }
  return entry;
}

/** Record an ad-spend charge (from billing engine). */
export function recordCharge(input: {
  amount: number;
  campaignId?: string;
  campaignTitle?: string;
  method?: string;
  description?: string;
  at?: string;
}): BillingEntry {
  const entry: BillingEntry = {
    id: `chg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: 'charge',
    amount: -Math.abs(input.amount),
    currency: 'RUB',
    description: input.description || 'Списание за показы/клики',
    campaignId: input.campaignId,
    campaignTitle: input.campaignTitle,
    method: input.method || 'cpm',
    status: 'succeeded',
    createdAt: input.at || new Date().toISOString(),
  };
  const list = loadLocalCharges();
  list.push(entry);
  saveLocalCharges(list);
  return entry;
}

/**
 * Build charge history from ad_events when no explicit charge log exists
 * (backfill for older campaigns).
 */
export function deriveChargesFromEvents(): BillingEntry[] {
  const events = listAdEvents();
  const campaigns = loadCampaignsLocal();
  const byDay = new Map<string, { impressions: number; clicks: number; campaignId: string; position: string; cost: number }>();

  for (const e of events) {
    const key = `${e.date}|${e.campaignId}|${e.position}`;
    const row = byDay.get(key) || { impressions: 0, clicks: 0, campaignId: e.campaignId, position: e.position, cost: 0 };
    if (e.kind === 'impression') row.impressions += 1;
    else row.clicks += 1;
    row.cost += Number(e.cost || 0);
    byDay.set(key, row);
  }

  const derived: BillingEntry[] = [];
  for (const [key, row] of byDay) {
    const [date, campaignId] = key.split('|');
    const c = campaigns.find(x => x.id === campaignId);
    const model = ((c?.paymentModel || c?.type || 'cpm') as AdPaymentModel);
    const amount =
      row.cost > 0
        ? row.cost
        : row.impressions * calculateEventCost(model, 'impression') +
          row.clicks * calculateEventCost(model, 'click');
    if (amount <= 0) continue;
    derived.push({
      id: `derived_${date}_${campaignId}_${row.position}`,
      kind: 'charge',
      amount: -amount,
      currency: 'RUB',
      description: `${date}: ${row.impressions} показов / ${row.clicks} кликов`,
      campaignId,
      campaignTitle: c?.title,
      method: model,
      status: 'succeeded',
      createdAt: `${date}T23:59:59.000Z`,
    });
  }
  return derived;
}

export async function loadBillingHistory(userId?: string): Promise<BillingEntry[]> {
  let remotePayments: BillingEntry[] = [];
  if (isSupabaseConfigured && userId) {
    try {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      remotePayments = (data || []).map((p: any) => ({
        id: String(p.id),
        kind: (p.status === 'succeeded' ? 'payment' : 'payment') as BillingEntryKind,
        amount: Math.abs(Number(p.amount || 0)),
        currency: p.currency || 'RUB',
        description: p.description || 'Платёж',
        method: p.payment_method || 'yookassa',
        status: (p.status as BillingEntry['status']) || 'succeeded',
        createdAt: p.created_at || new Date().toISOString(),
      }));
    } catch { /* offline */ }
  }

  const localPayments = loadLocalPayments();
  const charges = loadLocalCharges();
  const derived = charges.length ? [] : deriveChargesFromEvents();

  // de-dupe by id
  const map = new Map<string, BillingEntry>();
  for (const e of [...remotePayments, ...localPayments, ...charges, ...derived]) {
    if (!map.has(e.id)) map.set(e.id, e);
  }
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function billingTotals(entries: BillingEntry[]) {
  let toppedUp = 0;
  let spent = 0;
  let refunded = 0;
  for (const e of entries) {
    if (e.kind === 'payment') toppedUp += e.amount;
    else if (e.kind === 'refund') refunded += e.amount;
    else if (e.kind === 'charge') spent += Math.abs(e.amount);
  }
  const balance = toppedUp + refunded - spent;
  return { toppedUp, spent, refunded, balance };
}

export function exportBillingCsv(entries: BillingEntry[], filename = 'blogpost-billing'): void {
  const headers = ['date', 'kind', 'amount', 'currency', 'method', 'status', 'campaign', 'description'];
  const rows = entries.map(e =>
    [
      e.createdAt,
      e.kind,
      e.amount.toFixed(2),
      e.currency,
      e.method || '',
      e.status,
      e.campaignTitle || e.campaignId || '',
      `"${(e.description || '').replace(/"/g, '""')}"`,
    ].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${dayKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
