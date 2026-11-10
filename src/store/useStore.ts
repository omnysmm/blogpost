import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  signInWithEmail,
  signUpWithEmail,
  signOut as authSignOut,
  getSessionUser,
  onAuthStateChange,
} from '../services/auth';
import { generateText, generateImage, generateAudio, checkGenerationLimit } from '../services/ai';
import { fetchPosts, createPost, updatePost as crudUpdatePost, deletePost as crudDeletePost, fetchAnalytics as crudFetchAnalytics, upsertAnalytics, fetchPlatformStats, fetchAllUsers, fetchAllPosts, updateUserRole, banUser, unbanUser, adminSetPostStatus, validatePromoCode, exportToCSV, fetchAutoTasks as crudFetchAutoTasks, upsertAutoTask as crudUpsertAutoTask, deleteAutoTask as crudDeleteAutoTask } from '../services/crud';
import {
  loadPosts as loadLocalPosts,
  savePosts as saveLocalPosts,
  loadAnalytics as loadLocalAnalytics,
  saveAnalytics as saveLocalAnalytics,
  recordPublication as persistRecordPublication,
  resetNetworkPublications as persistResetNetworkPublications,
  saveSessionUser,
  loadSessionUser,
  clearSessionUser,
} from '../services/persistence';
import { isDueNow, publishPostToNetworks, consumeScheduledDate } from '../services/scheduler';
import { loadAutoTasks as loadLocalAutoTasks, saveAutoTasks as saveLocalAutoTasks, isTaskDue, pickTopic, markTaskSlotRan } from '../services/autoTasks';
import type { Language, Currency, Subscription, UserRole, User, Post, AdBlock, Analytics, AutoTask } from './types';
import type { PostStatus } from './types';

export type { Language, Currency, Subscription, UserRole, User, Post, AdBlock, Analytics, PostStatus, AutoTask };

interface AppState {
  language: Language;
  currency: Currency;
  currentUser: User | null;
  posts: Post[];
  adBlocks: AdBlock[];
  analytics: Analytics[];
  isSidebarOpen: boolean;
  currentPage: string;
  dataLoadedFor: string | null;

  setLanguage: (lang: Language) => void;
  setCurrency: (curr: Currency) => void;
  setCurrentUser: (user: User | null) => void;
  setCurrentPage: (page: string) => void;
  toggleSidebar: () => void;
  addPost: (post: Post) => Promise<void>;
  updatePost: (id: string, updates: Partial<Post>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  addAdBlock: (block: AdBlock) => void;
  updateAdBlock: (id: string, updates: Partial<AdBlock>) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => void;
  generateAIContent: (prompt: string, type: string) => Promise<string>;
  loadPosts: () => Promise<void>;
  loadAnalytics: (days?: number) => Promise<void>;
  loadUserData: () => Promise<void>;
  recordPublication: (network: string, postId?: string) => Promise<void>;
  resetNetworkPublications: (network: string) => void;
  moderatePost: (id: string, action: 'approve' | 'reject', note?: string) => void;
  enqueueForPublish: (id: string, scheduledAt?: string, scheduledDates?: string[], scheduledTime?: string, networks?: string[]) => void;
  restoreFromArchive: (id: string) => void;
  processDuePosts: () => Promise<number>;
  autoTasks: AutoTask[];
  loadAutoTasks: () => Promise<void>;
  saveAutoTasks: (tasks: AutoTask[]) => void;
  upsertAutoTask: (task: AutoTask) => Promise<void>;
  removeAutoTask: (id: string) => Promise<void>;
  processDueAutoTasks: () => Promise<number>;
  loadPlatformStats: () => Promise<void>;
  loadAllUsers: () => Promise<void>;
  loadAllPostsAdmin: () => Promise<void>;
  adminSetRole: (userId: string, role: string) => Promise<void>;
  adminBan: (userId: string) => Promise<void>;
  adminUnban: (userId: string) => Promise<void>;
  adminModeratePost: (postId: string, status: string) => Promise<void>;
  applyPromo: (code: string) => Promise<{ valid: boolean; discount: number; type: string } | null>;
  exportAnalyticsCSV: () => void;
  platformStats: { users: number; posts: number; revenue: number; pending: number };
  allUsers: any[];
  allPosts: any[];
}

const defaultAdBlocks: AdBlock[] = [
  { id: '1', title: 'Главный баннер', position: 'hero', type: 'banner', pricePerDay: 50000, link: '#', active: true, impressions: 15420, clicks: 342 },
  { id: '2', title: 'Боковой блок', position: 'sidebar', type: 'views', pricePerDay: 5000, link: '#', active: true, impressions: 8930, clicks: 156 },
  { id: '3', title: 'Встроенная реклама', position: 'inline', type: 'clicks', pricePerDay: 3000, link: '#', active: true, impressions: 12300, clicks: 89 },
  { id: '4', title: 'Нижний баннер', position: 'footer', type: 'banner', pricePerDay: 10000, link: '#', active: false, impressions: 5600, clicks: 78 },
];

// ═══ Read hash for legal pages / deep links ═══
const KNOWN_PAGES = new Set([
  'home', 'dashboard', 'content-generator', 'analytics', 'social-publish',
  'subscriptions', 'advertising', 'advertiser', 'advertiser-cabinet',
  'support', 'admin', 'profile', 'settings', 'auth',
]);

function getInitialPage(): string {
  // Hash may contain query params after OAuth redirect: #/auth?token=...&email=...
  const rawHash = window.location.hash.replace(/^#\/?/, '');
  const hash = rawHash.split('?')[0];
  if (hash.startsWith('legal/')) return hash;
  if (hash && KNOWN_PAGES.has(hash)) return hash;
  const saved = localStorage.getItem('blogpost_page');
  if (saved) return saved;
  return 'home';
}

// ═══ Post ↔ Supabase row mapping (source of truth) ═══
function postToRow(userId: string, p: Post) {
  return {
    id: p.id,
    user_id: userId,
    title: p.title,
    content: p.content,
    topic: p.topic,
    type: p.type,
    status: p.status,
    social_networks: p.socialNetworks,
    published_at: p.publishedAt ?? null,
    scheduled_at: p.scheduledAt ?? null,
    scheduled_dates: p.scheduledDates ?? [],
    scheduled_time: p.scheduledTime || null,
    moderation_note: p.moderationNote || null,
    has_audio: p.hasAudio,
    has_video: p.hasVideo,
    has_image: p.hasImage,
    ai_model: p.aiModel ?? null,
    views: p.views,
    likes: p.likes,
  };
}

function autoTaskToRow(userId: string, task: AutoTask) {
  return {
    id: task.id,
    user_id: userId,
    name: task.name,
    content_type: task.contentType,
    frequency: task.frequency,
    schedule: task.schedule,
    scheduled_dates: task.scheduledDates || [],
    networks: task.networks || [],
    topics: task.topics || [],
    active: task.active,
    last_run: task.lastRun || null,
    generated_count: task.generatedCount || 0,
  };
}

function rowToPost(r: any): Post {
  return {
    id: r.id,
    title: r.title || '',
    content: r.content || '',
    topic: r.topic || '',
    type: r.type || 'post',
    status: r.status || 'draft',
    createdAt: r.created_at || new Date().toISOString(),
    publishedAt: r.published_at || undefined,
    socialNetworks: r.social_networks || [],
    scheduledAt: r.scheduled_at || undefined,
    scheduledDates: r.scheduled_dates || [],
    scheduledTime: r.scheduled_time || undefined,
    moderationNote: r.moderation_note || undefined,
    hasAudio: !!r.has_audio,
    hasVideo: !!r.has_video,
    hasImage: !!r.has_image,
    aiModel: r.ai_model || undefined,
    views: r.views || 0,
    likes: r.likes || 0,
  };
}

export const useStore = create<AppState>((set, get) => ({
  language: 'ru',
  currency: 'RUB',
  currentUser: null,
  posts: [],
  adBlocks: defaultAdBlocks,
  analytics: [],
  isSidebarOpen: false,
  currentPage: getInitialPage(),
  platformStats: { users: 0, posts: 0, revenue: 0, pending: 0 },
  allUsers: [],
  allPosts: [],
  dataLoadedFor: null,
  autoTasks: [],

  setLanguage: (lang) => set({ language: lang, currency: 'RUB' }),
  setCurrency: (curr) => set({ currency: curr }),
  setCurrentUser: (user) => {
    if (user) saveSessionUser(user);
    else clearSessionUser();
    set({ currentUser: user });
  },
  setCurrentPage: (page) => {
    localStorage.setItem('blogpost_page', page);
    set({ currentPage: page });
  },
  toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),

  addPost: async (post) => {
    const posts = [...get().posts, post];
    set({ posts });
    const user = get().currentUser;
    if (!user) return;
    if (isSupabaseConfigured) {
      try {
        await createPost(postToRow(user.id, post));
      } catch (e) {
        console.error('addPost: Supabase write failed', e);
      }
    }
    saveLocalPosts(user.id, posts);
  },

  updatePost: async (id, updates) => {
    // Allow null to clear optional fields (publishedAt / scheduledAt)
    const cleaned: Partial<Post> = { ...updates };
    if ('publishedAt' in cleaned && cleaned.publishedAt == null) cleaned.publishedAt = undefined as any;
    if ('scheduledAt' in cleaned && cleaned.scheduledAt == null) cleaned.scheduledAt = undefined as any;

    const posts = get().posts.map(p => {
      if (p.id !== id) return p;
      const next: Post = { ...p, ...cleaned };
      // Explicit null clears the field locally
      if ('publishedAt' in updates && updates.publishedAt == null) next.publishedAt = undefined;
      if ('scheduledAt' in updates && updates.scheduledAt == null) next.scheduledAt = undefined;
      return next;
    });
    set({ posts });
    const user = get().currentUser;
    if (!user) return;
    const updated = posts.find(p => p.id === id);
    if (isSupabaseConfigured && updated) {
      try {
        // Full row upsert keeps all fields (incl. scheduledDates) in sync
        await crudUpdatePost(id, postToRow(user.id, updated));
      } catch (e) {
        console.error('updatePost: Supabase write failed', e);
      }
    }
    saveLocalPosts(user.id, posts);
  },

  deletePost: async (id) => {
    const posts = get().posts.filter(p => p.id !== id);
    set({ posts });
    const user = get().currentUser;
    if (!user) return;
    if (isSupabaseConfigured) {
      try {
        await crudDeletePost(id);
      } catch (e) {
        console.error('deletePost: Supabase write failed', e);
      }
    }
    saveLocalPosts(user.id, posts);
  },

  addAdBlock: (block) => set({ adBlocks: [...get().adBlocks, block] }),
  updateAdBlock: (id, updates) => set({ adBlocks: get().adBlocks.map(b => b.id === id ? { ...b, ...updates } : b) }),

  // ═══ Restore session after page refresh (Supabase session is source of truth) ═══
  restoreSession: () => {
    // Subscribe to Supabase auth changes (sign-in from another tab, OAuth return, etc.)
    onAuthStateChange(async (user) => {
      if (user) {
        saveSessionUser(user);
        set({
          currentUser: user,
          currentPage: getInitialPage() === 'home' ? 'dashboard' : getInitialPage(),
        });
        if (get().dataLoadedFor !== user.id) {
          await get().loadUserData();
        }
      } else {
        clearSessionUser();
        set({ currentUser: null, posts: [], analytics: [], dataLoadedFor: null });
      }
    });

    // Hydrate immediately from existing session
    void (async () => {
      const user = await getSessionUser();
      if (user) {
        saveSessionUser(user);
        set({
          currentUser: user,
          currentPage: getInitialPage() === 'home' ? 'dashboard' : getInitialPage(),
        });
        await get().loadUserData();
        return;
      }
      // Offline / SPA refresh: cached session (also when Supabase is configured
      // but no live auth session — keeps local/admin login across reloads).
      const saved = loadSessionUser<User>();
      if (saved && saved.id) {
        set({ currentUser: saved, currentPage: getInitialPage() === 'home' ? 'dashboard' : getInitialPage() });
      }
    })();
  },

  // ═══ Login ═══
  login: async (email, password) => {
    // Dev shortcut when Supabase is not configured
    if (!isSupabaseConfigured && email === 'admin@admin.ru' && password === 'admin') {
      const admin: User = {
        id: 'admin-1',
        name: 'Администратор',
        email: 'admin@admin.ru',
        role: 'admin',
        subscription: 'premium',
        registeredAt: new Date().toISOString(),
      };
      set({ currentUser: admin, currentPage: 'dashboard' });
      saveSessionUser(admin);
      await get().loadUserData();
      return true;
    }

    const result = await signInWithEmail(email, password);
    if (result.ok && result.user) {
      set({ currentUser: result.user, currentPage: 'dashboard' });
      saveSessionUser(result.user);
      await get().loadUserData();
      return true;
    }
    if (result.error === 'supabase_not_configured') {
      console.warn('login: Supabase is not configured');
    }
    return false;
  },

  // ═══ Register ═══
  register: async (name, email, password) => {
    const result = await signUpWithEmail(name, email, password);
    if (result.ok && result.user) {
      set({ currentUser: result.user, currentPage: 'dashboard' });
      saveSessionUser(result.user);
      await get().loadUserData();
      return true;
    }
    // Email confirmation pending — treat as success UI-wise (page shows message)
    if (result.needsEmailConfirm) return true;
    return false;
  },

  // ═══ Logout — keeps saved posts/analytics ═══
  logout: async () => {
    await authSignOut();
    localStorage.removeItem('blogpost_page');
    clearSessionUser();
    // Keep posts/analytics in localStorage so they survive re-login
    set({ currentUser: null, currentPage: 'home', posts: [], analytics: [], dataLoadedFor: null });
  },

  // ═══ AI Content Generation ═══
  generateAIContent: async (prompt, type) => {
    const user = get().currentUser;
    if (!user) throw new Error('Необходимо войти в аккаунт');

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

  // ═══ Load all user data (posts + analytics + autoTasks) ═══
  loadUserData: async () => {
    await Promise.all([get().loadPosts(), get().loadAnalytics(), get().loadAutoTasks()]);
  },

  // ═══ Load Posts (Supabase is the source of truth, localStorage = offline cache) ═══
  loadPosts: async () => {
    const user = get().currentUser;
    if (!user) return;

    const local = loadLocalPosts(user.id);

    if (!isSupabaseConfigured) {
      set({ posts: local, dataLoadedFor: user.id });
      return;
    }

    try {
      const remote = await fetchPosts(user.id);
      const remotePosts = (remote as any[]).map(rowToPost);

      if (remotePosts.length > 0) {
        // One-time migration: push cache-only posts that never reached Supabase
        const remoteIds = new Set(remotePosts.map(p => p.id));
        const localOnly = local.filter(p => !remoteIds.has(p.id));
        for (const p of localOnly) {
          try {
            await createPost(postToRow(user.id, p));
          } catch (e) {
            console.error('loadPosts: migrate local-only post failed', p.id, e);
          }
        }
        const posts = [...remotePosts, ...localOnly];
        saveLocalPosts(user.id, posts);
        set({ posts, dataLoadedFor: user.id });
      } else if (local.length > 0) {
        // Supabase empty but the cache has data — migrate once
        for (const p of local) {
          try {
            await createPost(postToRow(user.id, p));
          } catch (e) {
            console.error('loadPosts: migrate post failed', p.id, e);
          }
        }
        set({ posts: local, dataLoadedFor: user.id });
      } else {
        set({ posts: [], dataLoadedFor: user.id });
      }
    } catch (e) {
      console.error('loadPosts remote error, serving offline cache:', e);
      set({ posts: local, dataLoadedFor: user.id });
    }
  },

  // ═══ Load Analytics (Supabase is the source of truth, localStorage = offline cache) ═══
  loadAnalytics: async (_days?: number) => {
    const user = get().currentUser;
    if (!user) return;

    const local = loadLocalAnalytics(user.id);
    let analytics = local;

    if (isSupabaseConfigured) {
      try {
        const remote = await crudFetchAnalytics(user.id);
        const remoteRows = (remote as any[]).map((r: any) => ({
          date: r.date,
          network: r.network || '',
          views: r.views || 0,
          likes: r.likes || 0,
          shares: r.shares || 0,
          publications: r.publications || 0,
        })) as Analytics[];

        if (remoteRows.length > 0) {
          // One-time migration: push cache-only rows that never reached Supabase
          const remoteKeys = new Set(remoteRows.map(r => `${r.date}|${r.network}`));
          for (const row of local) {
            if (remoteKeys.has(`${row.date}|${row.network}`)) continue;
            try {
              await upsertAnalytics({
                user_id: user.id,
                date: row.date,
                network: row.network,
                views: row.views,
                likes: row.likes,
                shares: row.shares,
                publications: row.publications,
              });
            } catch (e) {
              console.error('loadAnalytics: migrate row failed', row.date, row.network, e);
            }
          }
          analytics = remoteRows.sort((a, b) => a.date.localeCompare(b.date));
        } else if (local.length > 0) {
          // Supabase empty but the cache has data — migrate once
          for (const row of local) {
            try {
              await upsertAnalytics({
                user_id: user.id,
                date: row.date,
                network: row.network,
                views: row.views,
                likes: row.likes,
                shares: row.shares,
                publications: row.publications,
              });
            } catch (e) {
              console.error('loadAnalytics: migrate row failed', row.date, row.network, e);
            }
          }
          analytics = local;
        } else {
          analytics = [];
        }
        saveLocalAnalytics(user.id, analytics);
      } catch (e) {
        console.error('loadAnalytics remote error, serving offline cache:', e);
        analytics = local;
      }
    }

    // Apply period filter for display (all data stays loaded)
    if (_days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - _days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      const filtered = analytics.filter(a => a.date >= cutoffStr);
      set({ analytics: filtered.length > 0 ? filtered : analytics, dataLoadedFor: user.id });
    } else {
      set({ analytics, dataLoadedFor: user.id });
    }
  },

  // ═══ Record publication to analytics (persistent) ═══
  recordPublication: async (network, postId) => {
    const user = get().currentUser;
    if (!user) return;
    const next = persistRecordPublication(user.id, network, get().analytics, postId);
    set({ analytics: next });

    if (isSupabaseConfigured) {
      try {
        const date = new Date().toISOString().split('T')[0];
        const existing = next.find(a => a.date === date && a.network === network);
        await upsertAnalytics({
          user_id: user.id,
          post_id: postId || null,
          network,
          date,
          views: existing?.views || 0,
          likes: existing?.likes || 0,
          shares: existing?.shares || 0,
          publications: existing?.publications || 1,
        });
      } catch (e) {
        console.error('recordPublication supabase error:', e);
      }
    }
  },

  // ═══ Zero publications counter for a network ═══
  resetNetworkPublications: (network) => {
    const user = get().currentUser;
    const next = persistResetNetworkPublications(user?.id || 'anonymous', network, get().analytics);
    set({ analytics: next });
  },

  // ═══ Moderation (user + admin) ═══
  moderatePost: (id, action, note) => {
    const post = get().posts.find(p => p.id === id);
    if (action === 'reject') {
      get().updatePost(id, { status: 'rejected', moderationNote: note || 'Отклонено' });
      return;
    }
    const hasSchedule = !!(post?.scheduledAt || post?.scheduledDates?.length);
    get().updatePost(id, {
      status: hasSchedule ? 'scheduled' : 'queued',
      moderationNote: note || 'Одобрено',
    });
  },

  // ═══ Put post into publish queue with schedule ═══
  enqueueForPublish: (id, scheduledAt, scheduledDates, scheduledTime, networks) => {
    const post = get().posts.find(p => p.id === id);
    if (!post) {
      console.warn('enqueueForPublish: post not found', id);
      return;
    }
    const updates: Partial<Post> = {
      status: scheduledAt || scheduledDates?.length ? 'scheduled' : 'queued',
    };
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt;
    if (scheduledDates !== undefined) updates.scheduledDates = scheduledDates;
    if (scheduledTime !== undefined) updates.scheduledTime = scheduledTime;
    if (networks !== undefined) updates.socialNetworks = networks;
    // If still on moderation, keep schedule fields but wait for approve
    if (post.status === 'moderating') {
      updates.status = 'moderating';
    }
    get().updatePost(id, updates);
  },

  // ═══ Restore published post from archive back to publish queue ═══
  // Clears schedule (scheduledAt / scheduledDates / scheduledTime) and publishedAt
  restoreFromArchive: (id) => {
    const post = get().posts.find(p => p.id === id);
    if (!post) {
      console.warn('restoreFromArchive: post not found', id);
      return;
    }
    get().updatePost(id, {
      status: 'queued',
      publishedAt: null as unknown as string | undefined,
      scheduledAt: null as unknown as string | undefined,
      scheduledDates: [],
      scheduledTime: '',
    });
  },

  // ═══ Auto-publish due posts (called by scheduler tick) ═══
  processDuePosts: async () => {
    const user = get().currentUser;
    if (!user) return 0;
    const due = get().posts.filter(p => isDueNow(p));
    if (!due.length) return 0;

    let published = 0;
    for (const post of due) {
      try {
        const { success, errors } = await publishPostToNetworks(post);
        if (errors.length) console.warn('Auto-publish errors', post.id, errors);
        if (success.length > 0) {
          for (const network of success) {
            await get().recordPublication(network, post.id);
          }
          const after = consumeScheduledDate(post);
          get().updatePost(post.id, after);
          published++;
        }
      } catch (e) {
        console.error('processDuePosts item failed', post.id, e);
      }
    }
    if (published > 0) {
      await get().loadAnalytics();
      await get().loadPosts();
    }
    return published;
  },

  // ═══ Auto-generation tasks ═══
  loadAutoTasks: async () => {
    const user = get().currentUser;
    if (!user) return;

    const local = loadLocalAutoTasks(user.id);
    let tasks = local;

    if (isSupabaseConfigured) {
      try {
        const remote = await crudFetchAutoTasks(user.id);
        const remoteTasks = (remote as any[]).map((r: any) => ({
          id: r.id,
          name: r.name || '',
          contentType: r.content_type || 'post',
          frequency: r.frequency || 'daily',
          schedule: typeof r.schedule === 'object' ? r.schedule : { time: '10:00', days: [] },
          scheduledDates: r.scheduled_dates || [],
          networks: r.networks || [],
          topics: r.topics || [],
          active: r.active ?? true,
          lastRun: r.last_run,
          generatedCount: r.generated_count || 0,
        })) as AutoTask[];

        if (remoteTasks.length > 0) {
          // One-time migration: push cache-only tasks that never reached Supabase
          const remoteIds = new Set(remoteTasks.map(t => t.id));
          const localOnly = local.filter(t => !remoteIds.has(t.id));
          for (const task of localOnly) {
            try {
              await crudUpsertAutoTask(autoTaskToRow(user.id, task));
            } catch (e) {
              console.error('loadAutoTasks: migrate task failed', task.id, e);
            }
          }
          tasks = [...remoteTasks, ...localOnly];
        } else if (local.length > 0) {
          // Supabase empty but the cache has data — migrate once
          for (const task of local) {
            try {
              await crudUpsertAutoTask(autoTaskToRow(user.id, task));
            } catch (e) {
              console.error('loadAutoTasks: migrate task failed', task.id, e);
            }
          }
          tasks = local;
        } else {
          tasks = [];
        }
        saveLocalAutoTasks(user.id, tasks);
      } catch (e) {
        console.error('loadAutoTasks remote error, serving offline cache:', e);
        tasks = local;
      }
    }

    set({ autoTasks: tasks });
  },
  saveAutoTasks: (tasks) => {
    const user = get().currentUser;
    set({ autoTasks: tasks });
    if (user) saveLocalAutoTasks(user.id, tasks);
  },
  upsertAutoTask: async (task) => {
    const user = get().currentUser;
    const list = get().autoTasks;
    const idx = list.findIndex(t => t.id === task.id);
    const next = idx >= 0 ? list.map(t => (t.id === task.id ? task : t)) : [...list, task];
    get().saveAutoTasks(next);
    if (user && isSupabaseConfigured) {
      try {
        await crudUpsertAutoTask(autoTaskToRow(user.id, task));
      } catch (e) {
        console.error('upsertAutoTask: Supabase write failed', e);
      }
    }
  },
  removeAutoTask: async (id) => {
    get().saveAutoTasks(get().autoTasks.filter(t => t.id !== id));
    if (isSupabaseConfigured) {
      try {
        await crudDeleteAutoTask(id);
      } catch (e) {
        console.error('removeAutoTask: Supabase delete failed', e);
      }
    }
  },

  /** Generate + enqueue posts for auto-tasks that are due. */
  processDueAutoTasks: async () => {
    const user = get().currentUser;
    if (!user) return 0;
    const tasks = get().autoTasks;
    if (!tasks.length) await get().loadAutoTasks();

    let ran = 0;
    for (const task of get().autoTasks) {
      const { due, day, time } = isTaskDue(task);
      if (!due) continue;

      const topic = pickTopic(task);
      try {
        const kindLabel =
          task.contentType === 'article' ? 'статью' :
          task.contentType === 'video' ? 'сценарий видео' :
          task.contentType === 'music' ? 'текст песни' :
          task.contentType === 'voiceover' ? 'текст для озвучки' :
          task.contentType === 'editing' ? 'план монтажа' : 'пост для соцсетей';

        const content = await generateText({
          prompt: `Напиши ${kindLabel} строго на тему: "${topic}". Готовый текст, без вступлений о генерации.`,
          language: get().language,
          maxLength: 1600,
        });

        const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7);
        get().addPost({
          id,
          title: topic,
          content,
          topic,
          type: (['post', 'article', 'video', 'music'] as const).includes(task.contentType as any)
            ? (task.contentType as Post['type'])
            : 'post',
          status: 'queued',
          createdAt: new Date().toISOString(),
          socialNetworks: task.networks || [],
          scheduledAt: new Date().toISOString(),
          scheduledDates: [day],
          scheduledTime: time,
          hasAudio: task.contentType === 'voiceover',
          hasVideo: task.contentType === 'video' || task.contentType === 'editing',
          hasImage: task.contentType === 'post' || task.contentType === 'article',
          aiModel: 'AutoML',
          views: 0,
          likes: 0,
        });

        markTaskSlotRan(task.id, day, time);
        get().upsertAutoTask({
          ...task,
          lastRun: new Date().toISOString(),
          generatedCount: (task.generatedCount || 0) + 1,
        });
        ran++;
      } catch (e) {
        console.error('processDueAutoTasks failed for', task.id, e);
        // Still mark slot to avoid tight error loop; user can edit & re-enable
        markTaskSlotRan(task.id, day, time);
      }
    }

    if (ran > 0) {
      await get().processDuePosts();
      await get().loadPosts();
    }
    return ran;
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

  loadAllPostsAdmin: async () => {
    if (!isSupabaseConfigured) return;
    const posts = await fetchAllPosts();
    set({ allPosts: posts });
  },

  adminSetRole: async (userId, role) => {
    await updateUserRole(userId, role);
    const users = await fetchAllUsers();
    set({ allUsers: users });
  },

  adminBan: async (userId) => {
    await banUser(userId);
    const users = await fetchAllUsers();
    set({ allUsers: users });
  },

  adminUnban: async (userId) => {
    await unbanUser(userId);
    const users = await fetchAllUsers();
    set({ allUsers: users });
  },

  adminModeratePost: async (postId, status) => {
    await adminSetPostStatus(postId, status);
    const posts = await fetchAllPosts();
    set({ allPosts: posts });
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
