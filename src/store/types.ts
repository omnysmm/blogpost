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

export type PostStatus =
  | 'draft'
  | 'generating'
  | 'ready'
  | 'queued'
  | 'moderating'
  | 'scheduled'
  | 'published'
  | 'rejected';

export interface Post {
  id: string;
  title: string;
  content: string;
  topic: string;
  type: 'post' | 'article' | 'video' | 'music';
  status: PostStatus;
  createdAt: string;
  publishedAt?: string;
  socialNetworks: string[];
  scheduledAt?: string;
  /** Multiple calendar dates (YYYY-MM-DD) for recurring auto-publish */
  scheduledDates?: string[];
  /** HH:MM time used with scheduledDates */
  scheduledTime?: string;
  moderationNote?: string;
  hasAudio: boolean;
  hasVideo: boolean;
  hasImage: boolean;
  aiModel?: string;
  views: number;
  likes: number;
}

export type ContentKind = 'post' | 'article' | 'video' | 'music' | 'voiceover' | 'editing';

export interface AutoTask {
  id: string;
  name: string;
  contentType: ContentKind;
  frequency: 'hourly' | 'daily' | 'weekly' | 'custom';
  schedule: { time: string; days: string[] };
  /** Calendar dates YYYY-MM-DD */
  scheduledDates?: string[];
  networks: string[];
  topics: string[];
  active: boolean;
  lastRun?: string;
  generatedCount: number;
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
  publications: number;
  network: string;
}