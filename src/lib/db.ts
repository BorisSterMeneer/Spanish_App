import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ReviewLogEntry, Settings, StoredCard } from '../types'
import { DEFAULT_SETTINGS } from '../types'

interface SpanishDB extends DBSchema {
  cards: { key: string; value: StoredCard }
  logs: { key: number; value: ReviewLogEntry; indexes: { ts: number } }
  meta: { key: string; value: unknown }
}

const DB_NAME = 'spanish-app'
const DB_VERSION = 1
let dbp: Promise<IDBPDatabase<SpanishDB>> | null = null

function db() {
  if (!dbp) {
    dbp = openDB<SpanishDB>(DB_NAME, DB_VERSION, {
      upgrade(d) {
        d.createObjectStore('cards', { keyPath: 'id' })
        const logs = d.createObjectStore('logs', { keyPath: 'id', autoIncrement: true })
        logs.createIndex('ts', 'ts')
        d.createObjectStore('meta')
      },
    })
  }
  return dbp
}

/** For tests: drop the cached connection. */
export async function _resetDbForTests() {
  if (dbp) (await dbp).close()
  dbp = null
}

export async function getAllCards(): Promise<StoredCard[]> {
  return (await db()).getAll('cards')
}

export async function putCards(cards: StoredCard[]): Promise<void> {
  const tx = (await db()).transaction('cards', 'readwrite')
  await Promise.all([...cards.map((c) => tx.store.put(c)), tx.done])
}

export async function addLog(entry: ReviewLogEntry): Promise<void> {
  await (await db()).add('logs', entry)
}

async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const v = await (await db()).get('meta', key)
  return (v as T | undefined) ?? fallback
}

async function setMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put('meta', value, key)
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await getMeta<Partial<Settings>>('settings', {})) }
}

export async function saveSettings(s: Settings): Promise<void> {
  await setMeta('settings', s)
}

export async function getSeenGrammar(): Promise<string[]> {
  return getMeta<string[]>('seenGrammar', [])
}

export async function markGrammarSeen(unitId: string): Promise<void> {
  const seen = new Set(await getSeenGrammar())
  seen.add(unitId)
  await setMeta('seenGrammar', [...seen])
}

/** Local calendar day, YYYY-MM-DD. */
export function dayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Seconds practised per day. */
export async function getPractice(): Promise<Record<string, number>> {
  return getMeta<Record<string, number>>('practice', {})
}

export async function addPracticeSeconds(seconds: number, d = new Date()): Promise<void> {
  if (seconds <= 0) return
  const p = await getPractice()
  const k = dayKey(d)
  p[k] = (p[k] ?? 0) + seconds
  await setMeta('practice', p)
}

// ------------------------------------------------------------ backup

export interface Backup {
  app: 'spanish-app'
  version: 1
  exportedAt: string
  cards: StoredCard[]
  logs: ReviewLogEntry[]
  meta: Record<string, unknown>
}

export async function exportAll(): Promise<Backup> {
  const d = await db()
  const keys = await d.getAllKeys('meta')
  const meta: Record<string, unknown> = {}
  for (const k of keys) meta[k] = await d.get('meta', k)
  return {
    app: 'spanish-app',
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: await d.getAll('cards'),
    logs: await d.getAll('logs'),
    meta,
  }
}

export function validateBackup(x: unknown): x is Backup {
  if (!x || typeof x !== 'object') return false
  const b = x as Partial<Backup>
  return b.app === 'spanish-app' && b.version === 1 && Array.isArray(b.cards) && Array.isArray(b.logs) && !!b.meta && typeof b.meta === 'object'
}

/** Replaces ALL local data with the backup. */
export async function importAll(b: Backup): Promise<void> {
  const d = await db()
  const tx = d.transaction(['cards', 'logs', 'meta'], 'readwrite')
  await tx.objectStore('cards').clear()
  await tx.objectStore('logs').clear()
  await tx.objectStore('meta').clear()
  for (const c of b.cards) await tx.objectStore('cards').put(c)
  for (const l of b.logs) await tx.objectStore('logs').put(l)
  for (const [k, v] of Object.entries(b.meta)) await tx.objectStore('meta').put(v, k)
  await tx.done
}

export async function resetAll(): Promise<void> {
  const d = await db()
  const tx = d.transaction(['cards', 'logs', 'meta'], 'readwrite')
  await tx.objectStore('cards').clear()
  await tx.objectStore('logs').clear()
  // keep settings (incl. AI config) on reset
  const settings = await tx.objectStore('meta').get('settings')
  await tx.objectStore('meta').clear()
  if (settings) await tx.objectStore('meta').put(settings, 'settings')
  await tx.done
}
