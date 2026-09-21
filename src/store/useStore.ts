import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateText, generateImage, generateAudio, checkGenerationLimit } from '../services/ai';
import { fetchPosts, createPost, updatePost as crudUpdatePost, deletePost as crudDeletePost, fetchAnalytics as crudFetchAnalytics, insertAnalytics, fetchPlatformStats, fetchAllUsers, validatePromoCode, exportToCSV } from '../services/crud';
import type { Language, Currency, Subscription, UserRole, User, Post, AdBlock, Analytics } from './types';

export type { Language, Currency, Subscription, UserRole, User, Post, AdBlock, Analytics };

interface AppState {
  language: Language;
  currency: Currency;
  currentUser: User | null;
  posts: Post[];
  adBlocks: AdBlock[];
  analytics: Analytics[];
  isSidebarOpen: boolean;
  currentPage: string;

  setLanguage: (lang: Language) => void;
  setCurrency: (curr: Currency) => void;
  setCurrentUser: (user: User | null) => void;
  setCurrentPage: (page: string) => void;
  toggleSidebar: () => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  addAdBlock: (block: AdBlock) => void;
  updateAdBlock: (id: string, updates: Partial<AdBlock>) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  generateAIContent: (prompt: string, type: string) => Promise<string>;
  loadPosts: () => Promise<void>;
  loadAnalytics: (days?: number) => Promise<void>;
  loadPlatformStats: () => Promise<void>;
  loadAllUsers: () => Promise<void>;
  applyPromo: (code: string) => Promise<{ valid: boolean; discount: number; type: string } | null>;
  exportAnalyticsCSV: () => void;
  platformStats: { users: number; posts: number; revenue: number; pending: number };
  allUsers: any[];
}

// ═══ Mock Data ═══
const defaultAnalytics: Analytics[] = [];
const networks = ['vk', 'telegram', 'youtube', 'instagram', 'tiktok', 'ok'];
for (let i = 29; i >= 0; i--) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  networks.forEach(network => {
    defaultAnalytics.push({
      date: date.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 5000) + 100,
      likes: Math.floor(Math.random() * 500) + 10,
      shares: Math.floor(Math.random() * 100) + 5,
      network,
    });
  });
}

const defaultAdBlocks: AdBlock[] = [
  { id: '1', title: 'Главный баннер', position: 'hero', type: 'banner', pricePerDay: 50000, link: '#', active: true, impressions: 15420, clicks: 342 },
  { id: '2', title: 'Боковой блок', position: 'sidebar', type: 'views', pricePerDay: 5000, link: '#', active: true, impressions: 8930, clicks: 156 },
  { id: '3', title: 'Встроенная реклама', position: 'inline', type: 'clicks', pricePerDay: 3000, link: '#', active: true, impressions: 12300, clicks: 89 },
  { id: '4', title: 'Нижний баннер', position: 'footer', type: 'banner', pricePerDay: 10000, link: '#', active: false, impressions: 5600, clicks: 78 },
];

// ═══ Auth helpers (localStorage fallback) ═══
function getLocalUsers(): any[] {
  try { return JSON.parse(localStorage.getItem('blogpro_users') || '[]'); } catch { return []; }
}
function saveLocalUsers(users: any[]) {
  localStorage.setItem('blogpro_users', JSON.stringify(users));
}

// ═══ Read hash for legal pages ═══
function getInitialPage(): string {
  const hash = window.location.hash.replace('#/', '');
  if (hash.startsWith('legal/')) return hash;
  const saved = localStorage.getItem('blogpost_page');
  if (saved) return saved;
  return 'home';
}

export const useStore = create<AppState>((set, get) => ({
  language: 'ru',
  currency: 'RUB',
  currentUser: null,
  posts: [],
  adBlocks: defaultAdBlocks,
  analytics: defaultAnalytics,
  isSidebarOpen: false,
  currentPage: getInitialPage(),
  platformStats: { users: 0, posts: 0, revenue: 0, pending: 0 },
  allUsers: [],

  setLanguage: (lang) => set({ language: lang, currency: lang === 'zh' ? 'CNY' : 'RUB' }),
  setCurrency: (curr) => set({ currency: curr }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentPage: (page) => {
    localStorage.setItem('blogpost_page', page);
    set({ currentPage: page });
  },
  toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),

  addPost: (post) => set({ posts: [...get().posts, post] }),
  updatePost: (id, updates) => set({ posts: get().posts.map(p => p.id === id ? { ...p, ...updates } : p) }),
  deletePost: (id) => set({ posts: get().posts.filter(p => p.id !== id) }),
  addAdBlock: (block) => set({ adBlocks: [...get().adBlocks, block] }),
  updateAdBlock: (id, updates) => set({ adBlocks: get().adBlocks.map(b => b.id === id ? { ...b, ...updates } : b) }),

  // ═══ Login ═══
  login: async (email, password) => {
    // Supabase auth
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          if (profile) {
            set({ currentUser: profile as User, currentPage: 'dashboard' });
            return true;
          }
        }
        // Supabase auth failed — fall through to local fallbacks
      } catch (e) {
        console.error('Supabase login error:', e);
        // Fall through to local fallbacks
      }
    }

    // Fallback: admin shortcut
    if (email === 'admin' && password === 'admin') {
      set({
        currentUser: {
          id: 'admin-1',
          name: 'Администратор',
          email: 'admin@blogpost.ru',
          role: 'admin',
          subscription: 'premium',
          registeredAt: new Date().toISOString(),
        },
        currentPage: 'dashboard',
      });
      return true;
    }

    // Fallback: localStorage
    const users = getLocalUsers();
    const user = users.find((u: any) => u.email === email);
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user;
      set({ currentUser: userWithoutPassword, currentPage: 'dashboard' });
      return true;
    }
    return false;
  },

  // ═══ Register ═══
  register: async (name, email, password) => {
    // Supabase auth
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error || !data.user) return false;

        // Profile is auto-created by trigger
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (profile) {
          set({ currentUser: profile as User, currentPage: 'dashboard' });
          return true;
        }
      } catch (e) {
        console.error('Supabase register error:', e);
      }
    }

    // Fallback: localStorage
    const users = getLocalUsers();
    if (users.find((u: any) => u.email === email)) return false;

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role: 'user' as UserRole,
      subscription: 'free' as Subscription,
      registeredAt: new Date().toISOString(),
      freeTrialEnd: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    };
    users.push(newUser);
    saveLocalUsers(users);
    const { password: _, ...userWithoutPassword } = newUser;
    set({ currentUser: userWithoutPassword, currentPage: 'dashboard' });
    return true;
  },

  // ═══ Logout ═══
  logout: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('blogpost_page');
    set({ currentUser: null, currentPage: 'home' });
  },

  // ═══ AI Content Generation ═══
  generateAIContent: async (prompt, type) => {
    const user = get().currentUser;
    if (!user) throw new Error('Необходимо войти в аккаунт');

    // Check limits
    const { allowed, remaining } = await checkGenerationLimit(user.id, user.subscription);
    if (!allowed) throw new Error('Лимит генераций исчерпан. Обновите тариф.');

    switch (type) {
      case 'post':
      case 'article':
        return await generateText({ prompt, language: get().language });
      case 'image':
        return await generateImage({ prompt });
      case 'audio':
        return await generateAudio({ text: prompt });
      default:
        return await generateText({ prompt, language: get().language });
    }
  },

  // ═══ Load Posts from Supabase ═══
  loadPosts: async () => {
    const user = get().currentUser;
    if (!user || !isSupabaseConfigured) return;
    const posts = await fetchPosts(user.id);
    set({ posts: posts as Post[] });
  },

  // ═══ Load Analytics from Supabase ═══
  loadAnalytics: async (days = 30) => {
    const user = get().currentUser;
    if (!user || !isSupabaseConfigured) return;
    const data = await crudFetchAnalytics(user.id, days);
    if (data.length > 0) {
      set({ analytics: data as Analytics[] });
    }
    // If empty, keep mock data
  },

  // ═══ Load Platform Stats (Admin) ═══
  loadPlatformStats: async () => {
    if (!isSupabaseConfigured) return;
    const stats = await fetchPlatformStats();
    set({ platformStats: stats });
  },

  // ═══ Load All Users (Admin) ═══
  loadAllUsers: async () => {
    if (!isSupabaseConfigured) return;
    const users = await fetchAllUsers();
    set({ allUsers: users });
  },

  // ═══ Apply Promo Code ═══
  applyPromo: async (code) => {
    return await validatePromoCode(code);
  },

  // ═══ Export Analytics CSV ═══
  exportAnalyticsCSV: () => {
    const analytics = get().analytics;
    exportToCSV(analytics, `blogpost-analytics-${new Date().toISOString().split('T')[0]}`);
  },
}));