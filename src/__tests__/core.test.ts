import { describe, it, expect } from 'vitest';
import { ensureSeoEngagement } from '../services/ai';
import { exportToCSV } from '../services/analytics';
import { isDueNow, getDueIso } from '../services/scheduler';
import { subscriptionDaysLeft, isSubscriptionExpiringSoon } from '../services/payment';
import type { Post } from '../store/types';

describe('ensureSeoEngagement', () => {
  it('appends #BlogPost when missing', () => {
    const out = ensureSeoEngagement('Просто текст', 'ru');
    expect(out).toContain('#BlogPost');
  });

  it('keeps existing #BlogPost', () => {
    const out = ensureSeoEngagement('Текст #BlogPost', 'ru');
    expect(out.match(/#BlogPost/gi)?.length).toBe(1);
  });

  it('appends CTA when missing', () => {
    const out = ensureSeoEngagement('Обычный текст без призыва', 'ru');
    expect(out.toLowerCase()).toMatch(/лайк|коммент|сохран/);
  });

  it('does not duplicate CTA when present', () => {
    const out = ensureSeoEngagement('Поставьте лайк и напишите комментарий', 'ru');
    expect(out.toLowerCase()).toMatch(/лайк/);
    expect(out.split('лайк').length).toBeLessThanOrEqual(3);
  });
});

describe('exportToCSV', () => {
  it('returns empty string for empty data', () => {
    expect(exportToCSV([])).toBe('');
  });

  it('exports headers and rows', () => {
    const csv = exportToCSV([
      { date: '2026-01-01', views: 10 },
      { date: '2026-01-02', views: 20 },
    ]);
    expect(csv.split('\n')[0]).toBe('date,views');
    expect(csv).toContain('2026-01-01,10');
  });
});

describe('scheduler isDueNow', () => {
  const base: Post = {
    id: '1',
    title: 't',
    content: 'c',
    topic: '',
    type: 'post',
    status: 'queued',
    createdAt: new Date().toISOString(),
    socialNetworks: [],
    hasAudio: false,
    hasVideo: false,
    hasImage: false,
    views: 0,
    likes: 0,
  };

  it('is not due when scheduled in the future', () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(isDueNow({ ...base, scheduledAt: future })).toBe(false);
  });

  it('is due when scheduled in the past (within catch-up)', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isDueNow({ ...base, scheduledAt: past })).toBe(true);
  });

  it('is not due when already published', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isDueNow({ ...base, status: 'published', scheduledAt: past })).toBe(false);
  });

  it('getDueIso returns ISO for scheduledAt', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(getDueIso({ ...base, scheduledAt: past })).toBeTruthy();
  });
});

describe('subscription helpers', () => {
  it('counts days left', () => {
    const in3 = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(subscriptionDaysLeft(in3)).toBeGreaterThanOrEqual(2);
  });

  it('flags expiring soon', () => {
    const in2 = new Date(Date.now() + 2 * 86_400_000).toISOString();
    expect(isSubscriptionExpiringSoon(in2, 3)).toBe(true);
    expect(isSubscriptionExpiringSoon(null, 3)).toBe(false);
  });
});
