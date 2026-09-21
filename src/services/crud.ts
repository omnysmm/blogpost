// Supabase CRUD Service — generic operations for all tables
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ═══ Generic CRUD ═══

export async function fetchAll<T>(table: string, userId?: string, filters?: Record<string, any>): Promise<T[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from(table).select('*');
  if (userId) query = query.eq('user_id', userId);
  if (filters) Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v); });
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) { console.error(`Fetch ${table} error:`, error); return []; }
  return (data || []) as T[];
}

export async function fetchById<T>(table: string, id: string): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) return null;
  return data as T;
}

export async function insert<T>(table: string, row: Partial<T>): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) { console.error(`Insert ${table} error:`, error); return null; }
  return data as T;
}

export async function updateById<T>(table: string, id: string, updates: Partial<T>): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from(table).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { console.error(`Update ${table} error:`, error); return null; }
  return data as T;
}

export async function deleteById(table: string, id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from(table).delete().eq('id', id);
  return !error;
}

// ═══ Posts CRUD ═══

export async function fetchPosts(userId: string) {
  return fetchAll<any>('posts', userId);
}

export async function createPost(post: any) {
  return insert('posts', post);
}

export async function updatePost(id: string, updates: any) {
  return updateById('posts', id, updates);
}

export async function deletePost(id: string) {
  return deleteById('posts', id);
}

// ═══ Ad Campaigns CRUD ═══

export async function fetchCampaigns(userId: string) {
  return fetchAll<any>('ad_campaigns', userId);
}

export async function createCampaign(campaign: any) {
  return insert('ad_campaigns', campaign);
}

export async function updateCampaign(id: string, updates: any) {
  return updateById('ad_campaigns', id, updates);
}

export async function deleteCampaign(id: string) {
  return deleteById('ad_campaigns', id);
}

// ═══ Tickets CRUD ═══

export async function fetchTickets(userId: string) {
  return fetchAll<any>('tickets', userId);
}

export async function createTicket(ticket: any) {
  return insert('tickets', ticket);
}

export async function updateTicket(id: string, updates: any) {
  return updateById('tickets', id, updates);
}

// ═══ Ticket Messages ═══

export async function fetchTicketMessages(ticketId: string) {
  return fetchAll<any>('ticket_messages', undefined, { ticket_id: ticketId });
}

export async function createTicketMessage(message: any) {
  return insert('ticket_messages', message);
}

// ═══ Payments ═══

export async function fetchPayments(userId: string) {
  return fetchAll<any>('payments', userId);
}

export async function createPayment(payment: any) {
  return insert('payments', payment);
}

// ═══ Social Accounts ═══

export async function fetchSocialAccounts(userId: string) {
  return fetchAll<any>('social_accounts', userId);
}

export async function connectSocialAccount(account: any) {
  return insert('social_accounts', account);
}

export async function disconnectSocialAccount(userId: string, network: string) {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('social_accounts').delete().eq('user_id', userId).eq('network', network);
  return !error;
}

// ═══ Analytics ═══

export async function fetchAnalytics(userId: string, days: number = 30) {
  if (!isSupabaseConfigured) return [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const { data, error } = await supabase
    .from('analytics')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function insertAnalytics(record: any) {
  return insert('analytics', record);
}

// ═══ User Blocks (constructor) ═══

export async function fetchUserBlocks(userId: string) {
  return fetchAll<any>('user_blocks', userId);
}

export async function toggleUserBlock(userId: string, blockType: string, active: boolean) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('user_blocks')
    .upsert({ user_id: userId, block_type: blockType, active, purchased_at: new Date().toISOString() }, { onConflict: 'user_id,block_type' })
    .select()
    .single();
  return error ? null : data;
}

// ═══ Promo Codes ═══

export async function validatePromoCode(code: string): Promise<{ valid: boolean; discount: number; type: string } | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('promo_codes').select('*').eq('code', code.toUpperCase()).eq('active', true).single();
  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  if (data.max_uses && data.used_count >= data.max_uses) return null;
  return { valid: true, discount: data.discount, type: data.type };
}

export async function applyPromoCode(code: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.rpc('use_promo_code', { code_text: code.toUpperCase(), user_id: userId });
  return !error;
}

// ═══ Admin: All Users ═══

export async function fetchAllUsers() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function updateUserRole(userId: string, role: string) {
  return updateById('profiles', userId, { role });
}

export async function banUser(userId: string) {
  return updateById('profiles', userId, { role: 'banned' });
}

// ═══ Admin: Platform Stats ═══

export async function fetchPlatformStats() {
  if (!isSupabaseConfigured) return { users: 0, posts: 0, revenue: 0, pending: 0 };
  const [usersRes, postsRes, paymentsRes, pendingRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('payments').select('amount').eq('status', 'succeeded'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'moderating'),
  ]);
  return {
    users: usersRes.count || 0,
    posts: postsRes.count || 0,
    revenue: (paymentsRes.data || []).reduce((s, p) => s + Number(p.amount), 0),
    pending: pendingRes.count || 0,
  };
}

// ═══ Export to CSV ═══

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}