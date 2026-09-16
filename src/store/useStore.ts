import { create } from 'zustand';

export type Language = 'ru' | 'en';
export type Currency = 'RUB' | 'USD' | 'CNY';
export type Subscription = 'free' | 'basic' | 'pro' | 'premium';
export type UserRole = 'user' | 'advertiser' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscription: Subscription;
  registeredAt: string;
  freeTrialEnd?: string;
  avatar?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  topic: string;
  type: 'post' | 'article' | 'video' | 'music';
  status: 'draft' | 'generating' | 'ready' | 'published' | 'moderating';
  createdAt: string;
  publishedAt?: string;
  socialNetworks: string[];
  scheduledAt?: string;
  hasAudio: boolean;
  hasVideo: boolean;
  hasImage: boolean;
  aiModel?: string;
  views: number;
  likes: number;
}

export interface AdBlock {
  id: string;
  title: string;
  position: string;
  type: 'views' | 'clicks' | 'banner';
  pricePerDay: number;
  imageUrl?: string;
  link: string;
  active: boolean;
  impressions: number;
  clicks: number;
}

export interface Analytics {
  date: string;
  views: number;
  likes: number;
  shares: number;
  network: string;
}

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
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string) => boolean;
  logout: () => void;
}

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
      network
    });
  });
}

const defaultAdBlocks: AdBlock[] = [
  { id: '1', title: 'Главный баннер', position: 'hero', type: 'banner', pricePerDay: 50000, link: '#', active: true, impressions: 15420, clicks: 342 },
  { id: '2', title: 'Боковой блок', position: 'sidebar', type: 'views', pricePerDay: 5000, link: '#', active: true, impressions: 8930, clicks: 156 },
  { id: '3', title: 'Встроенная реклама', position: 'inline', type: 'clicks', pricePerDay: 3000, link: '#', active: true, impressions: 12300, clicks: 89 },
  { id: '4', title: 'Нижний баннер', position: 'footer', type: 'banner', pricePerDay: 10000, link: '#', active: false, impressions: 5600, clicks: 78 },
];

export const useStore = create<AppState>((set, get) => ({
  language: 'ru',
  currency: 'RUB',
  currentUser: null,
  posts: [],
  adBlocks: defaultAdBlocks,
  analytics: defaultAnalytics,
  isSidebarOpen: false,
  currentPage: 'home',

  setLanguage: (lang) => set({ language: lang }),
  setCurrency: (curr) => set({ currency: curr }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),
  
  addPost: (post) => set({ posts: [...get().posts, post] }),
  updatePost: (id, updates) => set({ posts: get().posts.map(p => p.id === id ? { ...p, ...updates } : p) }),
  deletePost: (id) => set({ posts: get().posts.filter(p => p.id !== id) }),
  
  addAdBlock: (block) => set({ adBlocks: [...get().adBlocks, block] }),
  updateAdBlock: (id, updates) => set({ adBlocks: get().adBlocks.map(b => b.id === id ? { ...b, ...updates } : b) }),
  
  login: (email, password) => {
    if (email === 'admin' && password === 'admin') {
      set({
        currentUser: {
          id: 'admin-1',
          name: 'Администратор',
          email: 'admin@blogpro.ru',
          role: 'admin',
          subscription: 'premium',
          registeredAt: new Date().toISOString()
        }
      });
      return true;
    }
    const users = JSON.parse(localStorage.getItem('blogpro_users') || '[]');
    const user = users.find((u: any) => u.email === email);
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user;
      set({ currentUser: userWithoutPassword });
      return true;
    }
    return false;
  },
  
  register: (name, email, password) => {
    const users = JSON.parse(localStorage.getItem('blogpro_users') || '[]');
    if (users.find((u: any) => u.email === email)) return false;
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role: 'user' as UserRole,
      subscription: 'free' as Subscription,
      registeredAt: new Date().toISOString(),
      freeTrialEnd: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    };
    users.push(newUser);
    localStorage.setItem('blogpro_users', JSON.stringify(users));
    const { password: _, ...userWithoutPassword } = newUser;
    set({ currentUser: userWithoutPassword });
    return true;
  },
  
  logout: () => set({ currentUser: null, currentPage: 'home' })
}));
