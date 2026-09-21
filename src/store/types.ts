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