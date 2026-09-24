import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateText, generateImage, generateAudio, checkGenerationLimit } from '../services/ai';
import { fetchPosts, createPost, updatePost as crudUpdatePost, deletePost as crudDeletePost, fetchAnalytics as crudFetchAnalytics, insertAnalytics, fetchPlatformStats, fetchAllUsers, validatePromoCode, exportToCSV } from '../services/crud';
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
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
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
  loadAutoTasks: () => void;
  saveAutoTasks: (tasks: AutoTask[]) => void;
  upsertAutoTask: (task: AutoTask) => void;
  removeAutoTask: (id: string) => void;
  processDueAutoTasks: () => Promise<number>;
  loadPlatformStats: () => Promise<void>;
  loadAllUsers: () => Promise<void>;
  applyPromo: (code: string) => Promise<{ valid: boolean; discount: number; type: string } | null>;
  exportAnalyticsCSV: () => void;
  platformStats: { users: number; posts: number; revenue: number; pending: number };
  allUsers: any[];
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

function persistPosts(userId: string | null | undefined, posts: Post[]) {
  if (!userId) return;
  saveLocalPosts(userId, posts);
  // Best-effort sync to Supabase
  if (isSupabaseConfigured) {
    posts.forEach(p => {
      if (!p.id) return;
      const row = {
        id: p.id,
        user_id: userId,
        title: p.title,
        content: p.content,
        topic: p.topic,
        type: p.type,
        status: p.status,
        social_networks: p.socialNetworks,
        published_at: p.publishedAt,
        scheduled_at: p.scheduledAt,
        has_audio: p.hasAudio,
        has_video: p.hasVideo,
        has_image: p.hasImage,
        ai_model: p.aiModel,
        views: p.views,
        likes: p.likes,
      };
      crudUpdatePost(p.id, row).catch(() => {});
    });
  }
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

  addPost: (post) => {
    const posts = [...get().posts, post];
    set({ posts });
    const user = get().currentUser;
    if (user) {
      saveLocalPosts(user.id, posts);
      if (isSupabaseConfigured) {
        createPost({
          id: post.id,
          user_id: user.id,
          title: post.title,
          content: post.content,
          topic: post.topic,
          type: post.type,
          status: post.status,
          social_networks: post.socialNetworks,
          has_audio: post.hasAudio,
          has_video: post.hasVideo,
          has_image: post.hasImage,
          ai_model: post.aiModel,
          views: post.views,
          likes: post.likes,
        }).catch(() => {});
      }
    }
  },

  updatePost: (id, updates) => {
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
    if (user) {
      saveLocalPosts(user.id, posts);
      if (isSupabaseConfigured) {
        const row: any = { ...updates };
        if (updates.socialNetworks) row.social_networks = updates.socialNetworks;
        if ('publishedAt' in updates) row.published_at = updates.publishedAt ?? null;
        if ('scheduledAt' in updates) row.scheduled_at = updates.scheduledAt ?? null;
        if (updates.hasAudio !== undefined) row.has_audio = updates.hasAudio;
        if (updates.hasVideo !== undefined) row.has_video = updates.hasVideo;
        if (updates.hasImage !== undefined) row.has_image = updates.hasImage;
        if (updates.aiModel !== undefined) row.ai_model = updates.aiModel;
        delete row.socialNetworks;
        delete row.publishedAt;
        delete row.scheduledAt;
        delete row.hasAudio;
        delete row.hasVideo;
        delete row.hasImage;
        delete row.aiModel;
        delete row.createdAt;
        delete row.scheduledDates;
        delete row.scheduledTime;
        crudUpdatePost(id, row).catch(() => {});
      }
    }
  },

  deletePost: (id) => {
    const posts = get().posts.filter(p => p.id !== id);
    set({ posts });
    const user = get().currentUser;
    if (user) {
      saveLocalPosts(user.id, posts);
      if (isSupabaseConfigured) crudDeletePost(id).catch(() => {});
    }
  },

  addAdBlock: (block) => set({ adBlocks: [...get().adBlocks, block] }),
  updateAdBlock: (id, updates) => set({ adBlocks: get().adBlocks.map(b => b.id === id ? { ...b, ...updates } : b) }),

  // ═══ Restore session after page refresh ═══
  restoreSession: () => {
    const saved = loadSessionUser<User>();
    if (saved && saved.id) {
      set({ currentUser: saved, currentPage: getInitialPage() === 'home' ? 'dashboard' : getInitialPage() });
    }
  },

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
            saveSessionUser(profile);
            await get().loadUserData();
            return true;
          }
        }
      } catch (e) {
        console.error('Supabase login error:', e);
      }
    }

    // Fallback: admin shortcut
    if (email === 'admin' && password === 'admin') {
      const admin: User = {
        id: 'admin-1',
        name: 'Администратор',
        email: 'admin@blogpost.ru',
        role: 'admin',
        subscription: 'premium',
        registeredAt: new Date().toISOString(),
      };
      set({ currentUser: admin, currentPage: 'dashboard' });
      saveSessionUser(admin);
      await get().loadUserData();
      return true;
    }

    // Fallback: localStorage
    const users = getLocalUsers();
    const user = users.find((u: any) => u.email === email);
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user;
      set({ currentUser: userWithoutPassword, currentPage: 'dashboard' });
      saveSessionUser(userWithoutPassword);
      await get().loadUserData();
      return true;
    }
    return false;
  },

  // ═══ Register ═══
  register: async (name, email, password) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error || !data.user) return false;

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (profile) {
          set({ currentUser: profile as User, currentPage: 'dashboard' });
          saveSessionUser(profile);
          await get().loadUserData();
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
    saveSessionUser(userWithoutPassword);
    await get().loadUserData();
    return true;
  },

  // ═══ Logout — keeps saved posts/analytics ═══
  logout: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
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

  // ═══ Load all user data (posts + analytics) ═══
  loadUserData: async () => {
    await Promise.all([get().loadPosts(), get().loadAnalytics()]);
  },

  // ═══ Load Posts (localStorage first, then Supabase) ═══
  loadPosts: async () => {
    const user = get().currentUser;
    if (!user) return;

    const local = loadLocalPosts(user.id);
    let posts = local;

    if (isSupabaseConfigured) {
      try {
        const remote = await fetchPosts(user.id);
        if (remote && remote.length > 0) {
          const remotePosts = (remote as any[]).map((r: any) => ({
            id: r.id,
            title: r.title || '',
            content: r.content || '',
            topic: r.topic || '',
            type: r.type || 'post',
            status: r.status || 'draft',
            createdAt: r.created_at || new Date().toISOString(),
            publishedAt: r.published_at,
            socialNetworks: r.social_networks || [],
            scheduledAt: r.scheduled_at,
            hasAudio: !!r.has_audio,
            hasVideo: !!r.has_video,
            hasImage: !!r.has_image,
            aiModel: r.ai_model,
            views: r.views || 0,
            likes: r.likes || 0,
          })) as Post[];
          // Merge: keep local-only posts, prefer remote for shared ids
          const remoteIds = new Set(remotePosts.map(p => p.id));
          const localOnly = local.filter(p => !remoteIds.has(p.id));
          posts = [...remotePosts, ...localOnly];
          saveLocalPosts(user.id, posts);
        }
      } catch (e) {
        console.error('loadPosts remote error:', e);
      }
    }

    set({ posts, dataLoadedFor: user.id });
  },

  // ═══ Load Analytics (localStorage first, then Supabase) ═══
  loadAnalytics: async (_days = 30) => {
    const user = get().currentUser;
    if (!user) return;

    let analytics = loadLocalAnalytics(user.id);

    if (isSupabaseConfigured) {
      try {
        const remote = await crudFetchAnalytics(user.id, _days);
        if (remote && remote.length > 0) {
          const remoteRows = (remote as any[]).map((r: any) => ({
            date: r.date,
            network: r.network || '',
            views: r.views || 0,
            likes: r.likes || 0,
            shares: r.shares || 0,
            publications: r.publications || 0,
          })) as Analytics[];
          // Merge by date+network: take max values so local publications aren't lost
          const map = new Map<string, Analytics>();
          for (const row of [...remoteRows, ...analytics]) {
            const key = `${row.date}|${row.network}`;
            const prev = map.get(key);
            if (!prev) {
              map.set(key, { ...row });
            } else {
              map.set(key, {
                date: row.date,
                network: row.network,
                views: Math.max(prev.views, row.views),
                likes: Math.max(prev.likes, row.likes),
                shares: Math.max(prev.shares, row.shares),
                publications: Math.max(prev.publications, row.publications),
              });
            }
          }
          analytics = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
          saveLocalAnalytics(user.id, analytics);
        }
      } catch (e) {
        console.error('loadAnalytics remote error:', e);
      }
    }

    set({ analytics, dataLoadedFor: user.id });
  },

  // ═══ Record publication to analytics (persistent) ═══
  recordPublication: async (network, postId) => {
    const user = get().currentUser;
    if (!user) return;
    const next = persistRecordPublication(user.id, network, get().analytics, postId);
    set({ analytics: next });

    if (isSupabaseConfigured) {
      try {
        await insertAnalytics({
          user_id: user.id,
          post_id: postId || null,
          network,
          date: new Date().toISOString().split('T')[0],
          views: 0,
          likes: 0,
          shares: 0,
          publications: 1,
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
  loadAutoTasks: () => {
    const user = get().currentUser;
    if (!user) return;
    set({ autoTasks: loadLocalAutoTasks(user.id) });
  },
  saveAutoTasks: (tasks) => {
    const user = get().currentUser;
    set({ autoTasks: tasks });
    if (user) saveLocalAutoTasks(user.id, tasks);
  },
  upsertAutoTask: (task) => {
    const list = get().autoTasks;
    const idx = list.findIndex(t => t.id === task.id);
    const next = idx >= 0 ? list.map(t => (t.id === task.id ? task : t)) : [...list, task];
    get().saveAutoTasks(next);
  },
  removeAutoTask: (id) => {
    get().saveAutoTasks(get().autoTasks.filter(t => t.id !== id));
  },

  /** Generate + enqueue posts for auto-tasks that are due. */
  processDueAutoTasks: async () => {
    const user = get().currentUser;
    if (!user) return 0;
    const tasks = get().autoTasks;
    if (!tasks.length) get().loadAutoTasks();

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
