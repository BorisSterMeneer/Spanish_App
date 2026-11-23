import { dayKey } from './db'

/** Consecutive days (ending today, or yesterday if today isn't done yet) with at least `goalMinutes` practised. */
export function streakDays(practice: Record<string, number>, goalMinutes: number, today = new Date()): number {
  const goal = goalMinutes * 60
  const d = new Date(today)
  if ((practice[dayKey(d)] ?? 0) < goal) d.setDate(d.getDate() - 1)
  let n = 0
  while ((practice[dayKey(d)] ?? 0) >= goal) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function totalMinutes(practice: Record<string, number>): number {
  return Math.floor(Object.values(practice).reduce((a, b) => a + b, 0) / 60)
}

/** Minutes per day for the last `n` days, oldest first. */
export function lastDays(practice: Record<string, number>, n: number, today = new Date()): { key: string; minutes: number }[] {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    out.push({ key, minutes: Math.floor((practice[key] ?? 0) / 60) })
  }
  return out
}
