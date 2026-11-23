import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { _resetDbForTests, addPracticeSeconds, exportAll, getAllCards, getPractice, getSettings, importAll, putCards, resetAll, saveSettings, validateBackup } from '../lib/db'
import { newCard } from '../lib/srs'
import { DEFAULT_SETTINGS } from '../types'
import { streakDays } from '../lib/stats'

beforeEach(async () => {
  await _resetDbForTests()
  indexedDB.deleteDatabase('spanish-app')
})

describe('db', () => {
  it('round-trips a backup', async () => {
    await putCards([newCard('u1:hola', 'recog', 0)])
    await saveSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15 })
    await addPracticeSeconds(120, new Date(2026, 0, 1))
    const b = JSON.parse(JSON.stringify(await exportAll()))
    expect(validateBackup(b)).toBe(true)
    await resetAll()
    expect(await getAllCards()).toHaveLength(0)
    expect((await getSettings()).sessionMinutes).toBe(15) // settings survive reset
    await importAll(b)
    expect(await getAllCards()).toHaveLength(1)
    expect((await getPractice())['2026-01-01']).toBe(120)
  })
  it('rejects junk backups', () => {
    expect(validateBackup({ foo: 1 })).toBe(false)
    expect(validateBackup(null)).toBe(false)
  })
})

describe('streak', () => {
  it('counts consecutive days that met the goal, allowing today to be unfinished', () => {
    const p = { '2026-03-01': 600, '2026-03-02': 700, '2026-03-03': 100 }
    expect(streakDays(p, 10, new Date(2026, 2, 3, 12))).toBe(2)
    expect(streakDays(p, 10, new Date(2026, 2, 2, 12))).toBe(2)
    expect(streakDays(p, 10, new Date(2026, 2, 5, 12))).toBe(0)
  })
})
