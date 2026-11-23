import { describe, expect, it } from 'vitest'
import { SessionEngine, mcOptions, chooseExercise } from '../lib/session'
import { ITEMS, ITEM_BY_ID } from '../content/curriculum'
import { DEFAULT_SETTINGS, type StoredCard } from '../types'

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** Simulate one session of `seconds`, each task taking `secPerTask`. */
function simulate(engine: SessionEngine, start: number, seconds: number, correctRate: number, rng: () => number, secPerTask = 8) {
  let now = start
  const shown: string[] = []
  const types = new Set<string>()
  while (now - start < seconds * 1000) {
    const t = engine.next(now)
    if (t.type === 'grammar') engine.markGrammarSeen(t.unit.id)
    else if (t.type === 'intro') engine.introduce(t.item, now)
    else {
      shown.push(t.item.id)
      types.add(t.exercise)
      engine.answer(t.card.id, rng() < correctRate ? 'correct' : 'wrong', now)
    }
    now += secPerTask * 1000
  }
  return { shown, types, now }
}

describe('SessionEngine', () => {
  it('starts with the unit 1 grammar card, then the first item', () => {
    const e = new SessionEngine([], [], DEFAULT_SETTINGS, { tts: true, stt: true }, seeded())
    const t1 = e.next(0)
    expect(t1.type).toBe('grammar')
    e.markGrammarSeen('u1')
    const t2 = e.next(0)
    expect(t2).toMatchObject({ type: 'intro', item: { id: ITEMS[0].id } })
  })

  it('practises new items soon after introducing them (no long run of intro cards)', () => {
    const rng = seeded(5)
    const e = new SessionEngine([], ['u1'], DEFAULT_SETTINGS, { tts: true, stt: true }, rng)
    const kinds: string[] = []
    let now = 0
    for (let i = 0; i < 12; i++) {
      const t = e.next(now)
      kinds.push(t.type)
      if (t.type === 'intro') e.introduce(t.item, now)
      else if (t.type === 'exercise') e.answer(t.card.id, 'correct', now)
      now += 8000
    }
    const firstExercise = kinds.indexOf('exercise')
    expect(firstExercise).toBeGreaterThan(0)
    expect(firstExercise).toBeLessThanOrEqual(3)
  })

  it('fills a 10-minute session, respects the new-item cap, and avoids back-to-back repeats', () => {
    const rng = seeded(42)
    const e = new SessionEngine([], [], DEFAULT_SETTINGS, { tts: true, stt: true }, rng)
    const { shown } = simulate(e, 0, 600, 0.85, rng)
    expect(shown.length).toBeGreaterThan(20)
    expect(e.newIntroduced).toBeLessThanOrEqual(DEFAULT_SETTINGS.newPerSession + 8)
    let repeats = 0
    for (let i = 1; i < shown.length; i++) if (shown[i] === shown[i - 1]) repeats++
    expect(repeats).toBe(0)
  })

  it('over many days, reviews keep happening and new material keeps coming', () => {
    const rng = seeded(7)
    let cards: StoredCard[] = []
    let seen: string[] = []
    let day = 0
    for (; day < 30; day++) {
      const e = new SessionEngine(cards, seen, DEFAULT_SETTINGS, { tts: true, stt: true }, rng)
      const start = day * 86_400_000
      const { types } = simulate(e, start, 600, 0.85, rng)
      cards = [...e.cards.values()]
      seen = [...new Set([...seen, ...cards.map((c) => ITEM_BY_ID.get(c.itemId)!.id.split(':')[0])])]
      if (day === 29) {
        expect(types.has('type-spanish')).toBe(true)
      }
    }
    const started = new Set(cards.map((c) => c.itemId)).size
    expect(started).toBeGreaterThan(100) // most of the 8 units after a month
    expect(cards.some((c) => c.stability > 7)).toBe(true)
  })

  it('never offers speaking or listening when unsupported', () => {
    const rng = seeded(3)
    const card = { id: 'x', itemId: ITEMS[0].id, mode: 'prod', reps: 5, stability: 30 } as StoredCard
    for (let i = 0; i < 50; i++) {
      const ex = chooseExercise(card, ITEMS[0], DEFAULT_SETTINGS, { tts: false, stt: false }, rng)
      expect(ex).toBe('type-spanish')
    }
  })
})

describe('mcOptions', () => {
  it('returns 4 unique options including the answer', () => {
    for (const item of ITEMS.filter((i) => i.kind !== 'cloze')) {
      const o = mcOptions(item, 'en', new Map())
      expect(o).toContain(item.en)
      expect(new Set(o).size).toBe(4)
    }
  })
})
