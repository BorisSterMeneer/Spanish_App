import { ITEMS, ITEM_BY_ID, UNIT_OF_ITEM } from '../content/curriculum'
import type { ExerciseType, Item, Settings, StoredCard, Unit } from '../types'
import type { Verdict } from './answer'
import { newCard, retrievability, review, State, verdictToRating } from './srs'

export type Task =
  | { type: 'grammar'; unit: Unit }
  | { type: 'intro'; item: Item }
  | { type: 'exercise'; card: StoredCard; item: Item; exercise: ExerciseType }

export interface Capabilities {
  tts: boolean
  stt: boolean
}

/** Max cards in (re)learning at once before we stop introducing new items. */
const MAX_LEARNING = 8
/** Introduce a new item at most every N reviews while reviews are due. */
const REVIEWS_BETWEEN_NEW = 3
/** Don't show the same item again within this many tasks (if avoidable). */
const RECENT_WINDOW = 2
/** Below this many practicable cards, keep introducing new items past the cap. */
const MIN_PRACTICE_POOL = 6

export interface Rng {
  (): number
}

/**
 * Chooses what to show next in a time-boxed session.
 *
 * Priority:
 *  1. (re)learning cards whose short-term step is due
 *  2. due reviews, interleaved with new items (one new per 3 reviews)
 *  3. new items (up to `newPerSession`, while few cards are in learning)
 *  4. learning cards that are due soon (shown slightly early)
 *  5. extra practice: lowest-retrievability cards, so the session can always
 *     fill the full time
 */
export class SessionEngine {
  readonly cards: Map<string, StoredCard>
  private seenGrammar: Set<string>
  private recentItems: string[] = []
  newIntroduced = 0
  private reviewsSinceNew = REVIEWS_BETWEEN_NEW
  private settings: Settings
  private caps: Capabilities
  private rng: Rng
  /** When set, the session only practises (and introduces) items of this unit. */
  readonly unitId: string | null

  constructor(
    cards: StoredCard[],
    seenGrammar: string[],
    settings: Settings,
    caps: Capabilities,
    rng: Rng = Math.random,
    unitId: string | null = null,
  ) {
    this.unitId = unitId
    // Ignore cards whose item was removed from the curriculum.
    this.cards = new Map(cards.filter((c) => ITEM_BY_ID.has(c.itemId)).map((c) => [c.id, c]))
    this.seenGrammar = new Set(seenGrammar)
    this.settings = settings
    this.caps = caps
    this.rng = rng
  }

  /** First item in curriculum order that has no cards yet. */
  private inScope = (itemId: string) => !this.unitId || UNIT_OF_ITEM.get(itemId)?.id === this.unitId

  nextNewItem(): Item | undefined {
    return ITEMS.find((i) => this.inScope(i.id) && !this.cards.has(cardIdsFor(i)[0]))
  }

  dueCount(now: number): number {
    let n = 0
    for (const c of this.cards.values()) if (c.due <= now) n++
    return n
  }

  next(now: number): Task {
    const all = [...this.cards.values()].filter((c) => this.inScope(c.itemId))
    const fresh = (c: StoredCard) => !this.recentItems.includes(c.itemId)
    const pick = (pool: StoredCard[], by: (c: StoredCard) => number): StoredCard | undefined => {
      const preferred = pool.filter(fresh)
      const src = preferred.length ? preferred : []
      return src.sort((a, b) => by(a) - by(b))[0]
    }

    // Introduced-but-never-answered cards (State.New) count as learning too.
    const learning = all.filter((c) => c.state !== State.Review)
    const learningDue = learning.filter((c) => c.due <= now)
    const reviewDue = all.filter((c) => c.state === State.Review && c.due <= now)
    const newItem = this.nextNewItem()
    const canIntroduce = !!newItem && this.newIntroduced < this.settings.newPerSession && learning.length < MAX_LEARNING

    const c1 = pick(learningDue, (c) => c.due)
    if (c1) return this.exercise(c1)

    if (reviewDue.some(fresh) && (!canIntroduce || this.reviewsSinceNew < REVIEWS_BETWEEN_NEW)) {
      const c = pick(reviewDue, (c) => retrievability(c, now))!
      this.reviewsSinceNew++
      return this.exercise(c)
    }

    if (canIntroduce && newItem) return this.introduceTask(newItem, now)

    const c3 = pick(reviewDue, (c) => retrievability(c, now))
    if (c3) return this.exercise(c3)

    const c4 = pick(learning, (c) => c.due)
    if (c4) return this.exercise(c4)

    // Nothing due: extra practice on the weakest cards, as long as there is
    // enough variety. Only exceed the new-item cap when the deck is too small
    // to practise without constant repetition.
    const practicable = all.filter(fresh)
    if (practicable.length >= MIN_PRACTICE_POOL || !newItem) {
      const c5 = pick(all, (c) => retrievability(c, now))
      if (c5) return this.exercise(c5)
    }
    if (newItem) return this.introduceTask(newItem, now)

    // Everything is recent (tiny deck): relax the recency rule.
    const any = all.sort((a, b) => a.due - b.due)[0]
    if (any) return this.exercise(any)
    // Only reachable if the curriculum is empty.
    throw new Error('Nothing to study')
  }

  private introduceTask(item: Item, now: number): Task {
    const unit = UNIT_OF_ITEM.get(item.id)!
    if (!this.seenGrammar.has(unit.id)) return { type: 'grammar', unit }
    if (item.kind === 'cloze') {
      // Cloze drills have no intro card: the grammar card is the intro.
      this.introduce(item, now)
      const card = this.cards.get(cardIdsFor(item)[0])!
      return this.exercise(card)
    }
    return { type: 'intro', item }
  }

  markGrammarSeen(unitId: string) {
    this.seenGrammar.add(unitId)
  }

  /** Create the SRS cards for an item. Returns the new cards (to persist). */
  introduce(item: Item, now: number): StoredCard[] {
    const created: StoredCard[] =
      item.kind === 'cloze'
        ? [newCard(item.id, 'cloze', now)]
        : [newCard(item.id, 'recog', now), newCard(item.id, 'prod', now, 90_000)]
    for (const c of created) this.cards.set(c.id, c)
    this.newIntroduced++
    this.reviewsSinceNew = 0
    this.remember(item.id)
    return created
  }

  /** Grade an answer; returns the updated card (to persist). */
  answer(cardId: string, verdict: Verdict, now: number): StoredCard {
    const c = this.cards.get(cardId)
    if (!c) throw new Error(`unknown card ${cardId}`)
    const updated = review(c, verdictToRating(verdict), now)
    this.cards.set(updated.id, updated)
    return updated
  }

  private remember(itemId: string) {
    this.recentItems.push(itemId)
    if (this.recentItems.length > RECENT_WINDOW) this.recentItems.shift()
  }

  private exercise(card: StoredCard): Task {
    const item = ITEM_BY_ID.get(card.itemId)
    if (!item) throw new Error(`card for unknown item ${card.itemId}`)
    this.remember(item.id)
    return { type: 'exercise', card, item, exercise: chooseExercise(card, item, this.settings, this.caps, this.rng) }
  }
}

export function cardIdsFor(item: Item): string[] {
  return item.kind === 'cloze' ? [`${item.id}:cloze`] : [`${item.id}:recog`, `${item.id}:prod`]
}

/**
 * Exercise difficulty grows with how well the card is known:
 * recognition first, then production; audio-only once it's stable.
 */
export function chooseExercise(card: StoredCard, _item: Item, s: Settings, caps: Capabilities, rng: Rng): ExerciseType {
  const listen = s.enableListening && caps.tts
  const speak = s.enableSpeaking && caps.stt
  switch (card.mode) {
    case 'cloze':
      return card.reps < 2 ? 'cloze-mc' : 'cloze-type'
    case 'recog':
      if (listen && card.reps >= 2 && rng() < 0.4) return 'listen-meaning'
      return 'mc-meaning'
    case 'prod': {
      if (card.reps < 1) return 'mc-spanish'
      if (card.stability < 3) return 'type-spanish'
      const opts: ExerciseType[] = ['type-spanish']
      if (listen) opts.push('dictation')
      if (speak) opts.push('speak')
      return opts[Math.floor(rng() * opts.length)]
    }
  }
}

/** Multiple-choice options: the answer + 3 distractors of the same kind, preferring the same unit. */
export function mcOptions(item: Item, field: 'es' | 'en', cards: Map<string, StoredCard>, rng: Rng = Math.random): string[] {
  const correct = item[field]
  const unit = UNIT_OF_ITEM.get(item.id)
  const known = (i: Item) => cards.has(cardIdsFor(i)[0])
  const sameKind = (i: Item) => i.id !== item.id && i.kind !== 'cloze' && (i.kind === item.kind || (item.kind !== 'sentence' && i.kind !== 'sentence'))
  const pool = ITEMS.filter(sameKind).filter((i) => i[field] !== correct)
  const tiers = [
    pool.filter((i) => UNIT_OF_ITEM.get(i.id) === unit && known(i)),
    pool.filter((i) => UNIT_OF_ITEM.get(i.id) === unit),
    pool.filter(known),
    pool,
  ]
  const out = new Set<string>()
  for (const tier of tiers) {
    for (const i of shuffle([...tier], rng)) {
      if (out.size >= 3) break
      out.add(i[field])
    }
  }
  return shuffle([correct, ...[...out].slice(0, 3)], rng)
}

export function clozeOptions(item: Item, rng: Rng = Math.random): string[] {
  return shuffle([item.answer!, ...(item.choices ?? [])], rng)
}

export function shuffle<T>(a: T[], rng: Rng = Math.random): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Accepted Spanish answers for production-type exercises. */
export function acceptedSpanish(item: Item): string[] {
  if (item.kind === 'cloze') return [item.answer!]
  return [item.es, ...(item.alts ?? [])]
}
