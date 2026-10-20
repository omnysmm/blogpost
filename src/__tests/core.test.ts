import { describe, it, expect, beforeEach } from 'vitest';
import { isTaskDue, pickTopic, nextRunLabel, markTaskSlotRan, hasTaskSlotRan, loadAutoTasks, saveAutoTasks } from '../services/autoTasks';
import { loadSocialEntry, loadSocialCreds, isNetworkReady } from '../services/socialConfig';
import type { AutoTask } from '../store/types';

function task(over: Partial<AutoTask> = {}): AutoTask {
  return {
    id: 't1',
    name: 'Daily',
    content_type: 'post',
    frequency: 'daily',
    schedule: { time: '10:00', days: [] },
    scheduledDates: [],
    networks: ['telegram'],
    topics: ['ai', 'blog'],
    active: true,
    ...over,
  } as AutoTask;
}

describe('autoTasks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is due after schedule time same day, once per slot', () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const day = `${y}-${m}-${d}`;
    const t = task({ schedule: { time: '00:00', days: [] } });
    const now = Date.now();
    const r = isTaskDue(t, now);
    expect(r.due).toBe(true);
    markTaskSlotRan(t.id, day, '00:00');
    expect(isTaskDue(t, now).due).toBe(false);
    expect(hasTaskSlotRan(t.id, day, '00:00')).toBe(true);
  });

  it('skips inactive tasks and empty topics', () => {
    expect(isTaskDue(task({ active: false }), Date.now()).due).toBe(false);
    expect(isTaskDue(task({ topics: [] }), Date.now()).due).toBe(false);
  });

  it('respects weekday filter', () => {
    const t = task({ schedule: { time: '00:00', days: ['xxx'] } });
    expect(isTaskDue(t, Date.now()).due).toBe(false);
  });

  it('pickTopic returns a configured topic', () => {
    const t = task();
    expect(['ai', 'blog']).toContain(pickTopic(t));
  });

  it('nextRunLabel formats', () => {
    const label = nextRunLabel(task({ schedule: { time: '12:30', days: [] } }), 'ru');
    expect(label).toContain('12:30');
  });

  it('persists auto tasks per user', () => {
    saveAutoTasks('u1', [task()]);
    expect(loadAutoTasks('u1')).toHaveLength(1);
    expect(loadAutoTasks('u2')).toHaveLength(0);
  });
});

describe('socialConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads creds from blogpost_socials', () => {
    localStorage.setItem('blogpost_socials', JSON.stringify([
      { network: 'vk', connected: true, apiKey: 'tok', accountId: '-1' },
    ]));
    const e = loadSocialEntry('vk');
    expect(e?.apiKey).toBe('tok');
    expect(loadSocialCreds('vk')?.token).toBe('tok');
    expect(isNetworkReady('vk')).toBe(true);
    expect(isNetworkReady('telegram')).toBe(false);
  });

  it('ignores empty api keys', () => {
    localStorage.setItem('blogpost_socials', JSON.stringify([
      { network: 'ok', connected: true, apiKey: '  ' },
    ]));
    expect(loadSocialCreds('ok')).toBeNull();
  });
});
