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

// ═══ Create Payment ═══
export async function createPayment(userId: string, planId: string): Promise<{ confirmationUrl: string } | null> {
  const plan = PLANS[planId];
  if (!plan) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    // Mock: return a confirmation URL
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
      }),
    });

    const data = await response.json();
    return { confirmationUrl: data.confirmation_url };
  } catch (error) {
    console.error('Payment creation failed:', error);
    return null;
  }
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