import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { CardMode, StoredCard } from '../types'
import type { Verdict } from './answer'

export const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: true,
  enable_short_term: true, // learning steps (1m, 10m) so new cards come back within a session
})

export { State }

export function toFsrs(c: StoredCard): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  }
}

function fromFsrs(id: string, itemId: string, mode: CardMode, c: Card): StoredCard {
  return {
    id,
    itemId,
    mode,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.getTime() : null,
  }
}

export function newCard(itemId: string, mode: CardMode, now: number, delayMs = 0): StoredCard {
  const c = createEmptyCard(new Date(now + delayMs))
  return fromFsrs(`${itemId}:${mode}`, itemId, mode, c)
}

export function verdictToRating(v: Verdict): Grade {
  switch (v) {
    case 'correct':
    case 'accent':
      return Rating.Good
    case 'typo':
      return Rating.Hard
    case 'wrong':
      return Rating.Again
  }
}

export function review(card: StoredCard, rating: Grade, now: number): StoredCard {
  const { card: next } = scheduler.next(toFsrs(card), new Date(now), rating)
  return fromFsrs(card.id, card.itemId, card.mode, next)
}

export function retrievability(card: StoredCard, now: number): number {
  if (card.state === State.New) return 0
  return scheduler.get_retrievability(toFsrs(card), new Date(now), false)
}
