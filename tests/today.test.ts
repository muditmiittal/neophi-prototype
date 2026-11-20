import { describe, expect, it } from 'vitest';
import { dueToday, resurface, resurfaceReasons, snoozeUntil, weeklyRecap } from '../src/lib/resurface';
import { sharedUrl } from '../src/lib/shareTarget';
import type { Memory } from '../src/store/types';
import { spawnSync } from 'node:child_process';
import { addOwnNote, capture, doneResurface, getState, markOpened, snoozeResurface } from '../src/store/store';

const now = new Date(2026, 10, 20, 12);
const ago = (days: number) => { const date = new Date(now); date.setDate(date.getDate() - days); return date.toISOString(); };
const memory = (patch: Partial<Memory> = {}): Memory => ({
  id: 'old', createdAt: ago(60), title: 'My save', sample: false, source: { channel: 'link', platform: 'web' },
  mediaKind: 'none', note: null, extraNotes: [], noteLanguage: 'en', chosenIntent: null, private: false,
  status: 'ready', sourceNow: 'deleted', analysis: null, categoryId: null, categoryPinned: false,
  projectIds: [], momentPins: [], ledger: [], ...patch,
});

describe('explainable daily resurfacing', () => {
  it('stores opens, snooze and Done separately from the exact user note', () => {
    const { id } = capture({ url: 'https://example.com/today-test', note: '', noteLanguage: 'hi', chosenIntent: null, isPrivate: true, channel: 'share', sharedTitle: 'Shared source title' });
    addOwnNote(id, '  कल देखना · Sunday ko  ');
    markOpened(id);
    snoozeResurface(id);
    doneResurface(id);
    const saved = getState().memories.find((m) => m.id === id)!;
    expect(saved.note).toBe('  कल देखना · Sunday ko  ');
    expect(saved.title).toBe('Shared source title');
    expect(saved.analysis).toBeNull();
    expect(saved.lastOpenedAt).toBeTruthy();
    expect(saved.resurfaceSnoozedUntil).toBeTruthy();
    expect(saved.resurfaceDoneAt).toBeTruthy();
    expect(saved.ledger.some((entry) => entry.what.includes('snoozed'))).toBe(true);
    expect(getState().onboarded).toBe(true);
  });
  it.each([7, 30, 90])('returns the unopened %i day milestone', (days) => {
    const m = memory({ createdAt: ago(days) });
    expect(resurfaceReasons(m, [m], now)).toEqual([`Saved ${days} days ago, never opened`]);
    expect(resurfaceReasons({ ...m, lastOpenedAt: ago(1) }, [m], now)).toEqual([]);
  });
  it('does not invent a milestone between anniversaries', () => {
    expect(resurfaceReasons(memory({ createdAt: ago(31) }), [], now)).toEqual([]);
  });
  it('requires another save in the project in the last 14 days', () => {
    const old = memory({ projectIds: ['p'] });
    const recent = memory({ id: 'new', createdAt: ago(14), projectIds: ['p'] });
    expect(resurfaceReasons(old, [old, recent], now)).toEqual(['In a project with a save in the last 14 days']);
    expect(resurfaceReasons(old, [old, { ...recent, createdAt: ago(15) }], now)).toEqual([]);
    expect(resurfaceReasons(recent, [recent], now)).toEqual([]);
  });
  it('requires another save in the same category within 48 hours', () => {
    const old = memory({ categoryId: 'c' });
    const recent = memory({ id: 'new', categoryId: 'c', createdAt: ago(2) });
    expect(resurfaceReasons(old, [recent], now)).toEqual(['Shares a category with a save from the last 48 hours']);
    expect(resurfaceReasons(old, [{ ...recent, createdAt: ago(3) }], now)).toEqual([]);
  });
  it('brings back a pinned moment', () => {
    expect(resurfaceReasons(memory({ momentPins: [{ id: 'pin', from: 0, to: 3, label: 'This' }] }), [], now)).toEqual(['You pinned a moment here']);
  });
  it('is seeded, independent of input order and limited to 3', () => {
    const saves = Array.from({ length: 12 }, (_, i) => memory({ id: `save-${i}`, createdAt: ago(7) }));
    const picks = resurface(saves, now, 'seed');
    expect(picks).toHaveLength(3);
    expect(resurface([...saves].reverse(), now, 'seed')).toEqual(picks);
    expect(resurface(saves, new Date(2026, 10, 20, 23), 'seed')).toEqual(picks);
    expect(resurface(saves, now, 'another-seed')).not.toEqual(picks);
  });
  it('snoozes for 7 local calendar days, including the boundary', () => {
    const m = memory({ createdAt: ago(7), resurfaceSnoozedUntil: snoozeUntil(now) });
    expect(resurface([m], now)).toEqual([]);
    const end = new Date(snoozeUntil(now));
    const pinned = { ...m, momentPins: [{ id: 'p', from: 0, to: 1, label: 'pin' }] };
    expect(end.getDate()).toBe(27);
    expect(resurface([pinned], new Date(end.getTime() - 1))).toEqual([]);
    expect(resurface([pinned], end)).toHaveLength(1);
  });
  it('done excludes the memory on future days', () => {
    const m = memory({ resurfaceDoneAt: now.toISOString(), momentPins: [{ id: 'p', from: 0, to: 1, label: 'pin' }] });
    expect(resurface([m], now)).toEqual([]);
    expect(resurface([m], new Date(2026, 11, 20))).toEqual([]);
  });
  it('does not use private saves or future saves as context', () => {
    const old = memory({ categoryId: 'c' });
    expect(resurfaceReasons(old, [memory({ id: 'new', categoryId: 'c', createdAt: ago(-1) })], now)).toEqual([]);
    expect(resurfaceReasons(old, [memory({ id: 'new', categoryId: 'c', createdAt: ago(0), private: true })], now)).toEqual([]);
    expect(resurface([memory({ private: true, createdAt: ago(7) })], now)).toEqual([]);
  });
  it('counts only real saves and unique projects this Monday to Sunday', () => {
    const sunday = new Date(2026, 10, 22, 12);
    const saves = [memory({ createdAt: ago(1), projectIds: ['p', 'q'] }), memory({ id: 'two', createdAt: ago(2), projectIds: ['p'] }), memory({ id: 'sample', sample: true, createdAt: ago(1) }), memory({ id: 'last-week', createdAt: ago(7) })];
    expect(weeklyRecap(saves, sunday)).toMatchObject({ saved: 2, projects: 2 });
  });
});

describe('share target', () => {
  it.each([
    ['url=https%3A%2F%2Fexample.com%2Freel', 'https://example.com/reel'],
    ['text=See%20https%3A%2F%2Fexample.com%2Fa%20later', 'https://example.com/a'],
    [`text=${encodeURIComponent('कल यह देखना https://example.com/reel।')}`, 'https://example.com/reel'],
    ['text=No%20link%20here', ''],
    ['url=javascript%3Aalert(1)', ''],
    ['text=https%3A%2F%2Fexample.com%2Fone%20https%3A%2F%2Fexample.com%2Ftwo', 'https://example.com/one'],
  ])('extracts only the first HTTP URL: %s', (query, expected) => expect(sharedUrl(new URLSearchParams(query))).toBe(expected));
});

describe('local reminder day boundaries', () => {
  it.each(['Asia/Kolkata', 'America/New_York', 'UTC'])('respects midnight and DST under %s', (tz) => {
    const script = `const dueToday = ${dueToday.toString()};
      const now = new Date(2026, 2, 8, 0, 1);
      const end = new Date(2026, 2, 9);
      if (!dueToday(new Date(end.getTime() - 1).toISOString(), now)) process.exit(1);
      if (dueToday(end.toISOString(), now)) process.exit(2);
      if (!dueToday('2026-03-07T12:00:00+05:30', now)) process.exit(3);`;
    const result = spawnSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: tz } });
    expect(result.status).toBe(0);
  });
  it('includes overdue and later today, excludes next midnight', () => {
    const localNow = new Date(2026, 10, 20, 23, 59);
    expect(dueToday(new Date(2026, 10, 19).toISOString(), localNow)).toBe(true);
    expect(dueToday(new Date(2026, 10, 20, 23, 59, 59).toISOString(), localNow)).toBe(true);
    expect(dueToday(new Date(2026, 10, 21).toISOString(), localNow)).toBe(false);
    expect(dueToday(new Date(2026, 10, 21).toISOString(), new Date(2026, 10, 21))).toBe(true);
  });
  it('compares instants with explicit IST and negative offsets', () => {
    const instant = new Date(2026, 10, 20, 12);
    const sameInstant = instant.toISOString();
    expect(dueToday(sameInstant, instant)).toBe(true);
    expect(dueToday('2026-11-20T00:00:00+05:30', new Date('2026-11-20T12:00:00+05:30'))).toBe(true);
    expect(dueToday('2026-11-19T13:30:00-05:00', new Date('2026-11-20T12:00:00+05:30'))).toBe(true);
  });
  it('uses the actual local midnight offset, including DST', () => {
    const n = new Date(2026, 2, 8, 0, 1);
    const midnight = new Date(2026, 2, 9);
    expect(dueToday(new Date(midnight.getTime() - 1).toISOString(), n)).toBe(true);
    expect(dueToday(midnight.toISOString(), n)).toBe(false);
  });
  it('ignores missing and invalid reminders', () => {
    expect(dueToday(undefined, now)).toBe(false);
    expect(dueToday('not a date', now)).toBe(false);
  });
});
