// Payment Service — YooKassa (Яндекс.Оплата) integration

export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
}

export const PLANS: Record<string, PaymentPlan> = {
  basic: { id: 'basic', name: 'Базовый', price: 990, currency: 'RUB', period: 'month' },
  pro: { id: 'pro', name: 'Профессиональный', price: 4990, currency: 'RUB', period: 'month' },
  premium: { id: 'premium', name: 'Премиум', price: 9990, currency: 'RUB', period: 'month' },
};

export const BLOCKS: Record<string, { name: string; price: number }> = {
  articles: { name: 'Публикация статей', price: 1500 },
  voice: { name: 'Генерация голоса', price: 2000 },
  video: { name: 'Генерация видео', price: 3500 },
  music: { name: 'Генерация музыки', price: 2500 },
  images: { name: 'Генерация изображений', price: 1800 },
  seo: { name: 'SEO-оптимизация', price: 1200 },
  analytics: { name: 'Расширенная аналитика', price: 2200 },
  schedule: { name: 'Автопубликация', price: 1000 },
};

// ═══════════════════════════════════════════════════════════════
// Plan upgrade / downgrade / cancel
// ═══════════════════════════════════════════════════════════════

export type PlanId = 'free' | 'basic' | 'pro' | 'premium';

const PLAN_RANK: Record<PlanId, number> = { free: 0, basic: 1, pro: 2, premium: 3 };

export function planRank(plan: string): number {
  return PLAN_RANK[(plan as PlanId)] ?? 0;
}

/** 'upgrade' → paid now (new period), 'downgrade' → scheduled at period end, 'none' → same plan. */
export function planChangeKind(current: string, next: string): 'upgrade' | 'downgrade' | 'none' {
  if (current === next) return 'none';
  return planRank(next) > planRank(current) ? 'upgrade' : 'downgrade';
}

function supabaseRestHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Prefer': 'return=minimal',
  };
}

/**
 * Schedule a downgrade/cancel to take effect at the end of the paid period.
 * The cron sweep (expire_subscriptions) applies `pending_subscription` later.
 * Pass `null` to clear a previously scheduled change.
 */
export async function schedulePlanChange(
  userId: string,
  nextPlan: PlanId | null
): Promise<{ ok: boolean; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return { ok: false, error: 'supabase_not_configured' };
  }
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: supabaseRestHeaders(),
      body: JSON.stringify({
        pending_subscription: nextPlan,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Cancel a scheduled change (stay on the current plan). */
export async function cancelScheduledChange(userId: string): Promise<{ ok: boolean; error?: string }> {
  return schedulePlanChange(userId, null);
}

/** Apply an upgrade immediately after a successful payment (period +1 month). */
export async function activatePlanChange(userId: string, planId: PlanId): Promise<{ ok: boolean; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return { ok: false, error: 'supabase_not_configured' };
  }
  const trialEnd = new Date();
  trialEnd.setMonth(trialEnd.getMonth() + 1);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: supabaseRestHeaders(),
      body: JSON.stringify({
        subscription: planId,
        pending_subscription: null,
        free_trial_end: trialEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ═══ Create Payment ═══
export async function createPayment(userId: string, planId: string): Promise<{ confirmationUrl: string; paymentId?: string } | null> {
  const plan = PLANS[planId];
  if (!plan) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('Supabase not configured. Mock payment created.');
    return { confirmationUrl: '#' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        userId,
        amount: { value: plan.price.toFixed(2), currency: plan.currency },
        description: `Подписка BlogPost — ${plan.name}`,
        metadata: { planId, userId },
        returnUrl: `${window.location.origin}/#/subscriptions?payment=success&plan=${planId}`,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      console.error('create-payment failed:', data.error);
      return null;
    }
    return { confirmationUrl: data.confirmation_url, paymentId: data.id };
  } catch (error) {
    console.error('Payment creation failed:', error);
    return null;
  }
}

/** Persist payment into billing ledger once YooKassa creates it (pending until webhook). */
export function logPaymentForBilling(
  userId: string,
  amount: number,
  description: string,
  paymentId?: string
) {
  import('./billingHistory')
    .then(({ recordPayment }) => {
      recordPayment({
        id: paymentId || undefined,
        amount,
        description,
        method: 'yookassa',
        status: 'pending',
        userId,
      });
    })
    .catch(() => {});
}

// ═══ Create Block Payment ═══
export async function createBlockPayment(userId: string, blockIds: string[]): Promise<{ confirmationUrl: string } | null> {
  const total = blockIds.reduce((sum, id) => sum + (BLOCKS[id]?.price || 0), 0);
  if (total === 0) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('Supabase not configured. Mock block payment created.');
    return { confirmationUrl: '#' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        userId,
        amount: { value: total.toFixed(2), currency: 'RUB' },
        description: `Блоки BlogPost: ${blockIds.map(id => BLOCKS[id]?.name).join(', ')}`,
        metadata: { blockIds, userId },
      }),
    });

    const data = await response.json();
    return { confirmationUrl: data.confirmation_url };
  } catch (error) {
    console.error('Block payment creation failed:', error);
    return null;
  }
}

// ═══ Check Subscription Status ═══
export async function checkSubscription(userId: string): Promise<{ plan: string; expiresAt: string | null }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    return { plan: 'free', expiresAt: null };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=subscription,free_trial_end`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });
    const data = await response.json();
    if (data.length > 0) {
      return { plan: data[0].subscription, expiresAt: data[0].free_trial_end };
    }
    return { plan: 'free', expiresAt: null };
  } catch {
    return { plan: 'free', expiresAt: null };
  }
}

// ═══ Subscription helpers ═══
export async function refreshSubscription(userId: string): Promise<{ plan: string; expiresAt: string | null }> {
  return checkSubscription(userId);
}

/** Days left on trial/paid plan. */
export function subscriptionDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** True when trial/subscription expires within `days`. */
export function isSubscriptionExpiringSoon(expiresAt: string | null, days = 3): boolean {
  const left = subscriptionDaysLeft(expiresAt);
  return left !== null && left <= days;
}

/**
 * Client-side enforcement of expiry: downgrade the plan when the trial/paid
 * period is over and persist it. Server-side cron (expire_subscriptions /
 * subscription-expiry edge fn) is the source of truth; this keeps the UI
 * honest between sweeps.
 */
export async function enforceSubscriptionExpiry<T extends { id: string; subscription: string; freeTrialEnd?: string }>(
  user: T
): Promise<T> {
  if (user.subscription === 'free') return user;
  if (!user.freeTrialEnd) return user;
  if (new Date(user.freeTrialEnd).getTime() > Date.now()) return user;

  const downgraded: T = { ...user, subscription: 'free' as string };
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ subscription: 'free', updated_at: new Date().toISOString() }),
      });
    } catch {
      // offline — server cron will catch up
    }
  }
  return downgraded;
}

// ═══ Request Refund ═══
export async function requestRefund(paymentId: string, reason: string): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) return false;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/refund-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ paymentId, reason }),
    });
    return response.ok;
  } catch {
    return false;
  }
}