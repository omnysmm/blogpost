import { describe, it, expect } from 'vitest';
import { buildRecommendations, describeStats } from '../services/recommendations';
import type { Analytics, Post } from '../store/types';

function analytics(rows: Array<[string, string, number, number, number, number]>): Analytics[] {
  return rows.map(([date, network, views, likes, shares, publications]) => ({
    date, network, views, likes, shares, publications,
  }));
}

function post(id: string, type: Post['type']): Post {
  return {
    id,
    title: `t-${id}`,
    content: '',
    topic: '',
    type,
    status: 'published',
    createdAt: '2026-10-01T10:00:00.000Z',
    socialNetworks: [],
    hasAudio: false,
    hasVideo: false,
    hasImage: false,
    views: 0,
    likes: 0,
  };
}

describe('buildRecommendations', () => {
  it('recommends focusing on the dominant network', () => {
    const rows = analytics([
      ['2026-10-01', 'vk', 10000, 300, 100, 5],
      ['2026-10-01', 'telegram', 500, 10, 2, 5],
    ]);
    const out = buildRecommendations(rows, [], 'en');
    const focus = out.find(r => r.id === 'net-focus');
    expect(focus).toBeTruthy();
    expect(focus!.description).toContain('VK');
  });

  it('flags low engagement', () => {
    const rows = analytics([
      ['2026-10-01', 'vk', 10000, 50, 10, 20],
    ]);
    const out = buildRecommendations(rows, [], 'ru');
    expect(out.some(r => r.id === 'engage-low')).toBe(true);
  });

  it('recommends more frequent publishing when cadence is low', () => {
    const rows = analytics([
      ['2026-10-01', 'vk', 1000, 100, 50, 1],
    ]);
    const out = buildRecommendations(rows, [], 'en', 30);
    expect(out.some(r => r.id === 'cadence-up')).toBe(true);
  });

  it('suggests video content when video share is low', () => {
    const posts = [
      post('1', 'post'), post('2', 'post'), post('3', 'post'),
      post('4', 'post'), post('5', 'post'), post('6', 'article'),
    ];
    const out = buildRecommendations([], posts, 'en');
    expect(out.some(r => r.id === 'mix-video')).toBe(true);
  });

  it('returns a healthy fallback when data is fine', () => {
    const rows = analytics([
      ['2026-10-01', 'vk', 1000, 50, 30, 20],
      ['2026-10-01', 'telegram', 900, 40, 25, 20],
    ]);
    const out = buildRecommendations(rows, [], 'en', 30);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every(r => r.title.length > 0)).toBe(true);
  });

  it('handles empty data without throwing', () => {
    const out = buildRecommendations([], [], 'ru');
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].id).toBe('all-good');
  });

  it('describeStats includes totals', () => {
    const rows = analytics([['2026-10-01', 'vk', 100, 10, 5, 2]]);
    const s = describeStats(rows, [post('1', 'video')], 'en');
    expect(s).toContain('2 posts');
    expect(s).toContain('100 views');
  });
});
