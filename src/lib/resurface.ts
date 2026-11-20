import type { Memory } from '../store/types';

const DAY = 86_400_000;
export const dayKey = (now: Date) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
const calendarDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;

/** Includes overdue reminders and the rest of the current local calendar day. */
export function dueToday(at: string | null | undefined, now: Date): boolean {
  const end = new Date(now);
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  return !!at && Number.isFinite(Date.parse(at)) && Date.parse(at) < end.getTime();
}

export function eligible(m: Memory, now: Date): boolean {
  return !m.private && !m.resurfaceDoneAt && !(m.resurfaceSnoozedUntil && Date.parse(m.resurfaceSnoozedUntil) > now.getTime());
}

export function resurfaceReasons(m: Memory, memories: Memory[], now: Date): string[] {
  if (!eligible(m, now) || Date.parse(m.createdAt) > now.getTime()) return [];
  const reasons: string[] = [];
  const age = calendarDay(now) - calendarDay(new Date(m.createdAt));
  if ([7, 30, 90].includes(age) && !m.lastOpenedAt) reasons.push(`Saved ${age} days ago, never opened`);
  const recent = (other: Memory, duration: number) => other.id !== m.id && !other.private && Date.parse(other.createdAt) <= now.getTime() && now.getTime() - Date.parse(other.createdAt) <= duration;
  if (memories.some((other) => recent(other, 14 * DAY) && other.projectIds.some((id) => m.projectIds.includes(id)))) reasons.push('In a project with a save in the last 14 days');
  if (m.categoryId && memories.some((other) => recent(other, 2 * DAY) && other.categoryId === m.categoryId)) reasons.push('Shares a category with a save from the last 48 hours');
  if (m.momentPins.length) reasons.push('You pinned a moment here');
  return reasons;
}

// Stable seeded tie-breaker. Input order never affects the daily selection.
function hash(text: string): number {
  let value = 2166136261;
  for (const c of text) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
  return value >>> 0;
}
export function resurface(memories: Memory[], now: Date, seed = dayKey(now), limit = 3) {
  return memories.map((memory) => ({ memory, reasons: resurfaceReasons(memory, memories, now) }))
    .filter((item) => item.reasons.length)
    .sort((a, b) => hash(`${seed}:${a.memory.id}`) - hash(`${seed}:${b.memory.id}`) || a.memory.id.localeCompare(b.memory.id))
    .slice(0, limit);
}

export function snoozeUntil(now: Date): string {
  const next = new Date(now);
  next.setDate(next.getDate() + 7);
  return next.toISOString();
}

export function weeklyRecap(memories: Memory[], now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const own = memories.filter((m) => !m.sample);
  const saved = own.filter((m) => Date.parse(m.createdAt) >= start.getTime() && Date.parse(m.createdAt) <= now.getTime());
  return { saved: saved.length, projects: new Set(saved.flatMap((m) => m.projectIds)).size, picks: resurface(own, now) };
}
