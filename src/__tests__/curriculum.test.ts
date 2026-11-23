import { describe, expect, it } from 'vitest'
import { ITEMS, UNITS } from '../content/curriculum'
import { checkAnswer } from '../lib/answer'

describe('curriculum', () => {
  it('has unique item ids', () => {
    const ids = ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('has unique Spanish and English text within each unit (for multiple choice)', () => {
    for (const u of UNITS) {
      for (const field of ['es', 'en'] as const) {
        const vals = u.items.filter((i) => i.kind !== 'cloze').map((i) => i[field].toLowerCase())
        expect(new Set(vals).size, `${u.id} ${field}`).toBe(vals.length)
      }
    }
  })
  it('cloze drills are well-formed', () => {
    for (const i of ITEMS.filter((x) => x.kind === 'cloze')) {
      expect(i.cloze, i.id).toContain('___')
      expect(i.answer, i.id).toBeTruthy()
      expect(i.choices?.length, i.id).toBeGreaterThanOrEqual(2)
      expect(i.choices, i.id).not.toContain(i.answer)
      expect(new Set(i.choices).size, i.id).toBe(i.choices!.length)
      expect(i.en, i.id).toBeTruthy()
      // No distractor should be accepted as correct by the checker.
      for (const c of i.choices!) expect(checkAnswer(c, [i.answer!], { allowTypo: false }).verdict, `${i.id} ${c}`).toBe('wrong')
    }
  })
  it('every unit has a grammar card with examples and a mix of items', () => {
    for (const u of UNITS) {
      expect(u.grammar.body.length).toBeGreaterThan(1)
      expect(u.grammar.examples.length).toBeGreaterThan(1)
      expect(u.items.some((i) => i.kind === 'cloze'), u.id).toBe(true)
      expect(u.items.some((i) => i.kind !== 'cloze'), u.id).toBe(true)
    }
  })
  it('has enough items for multiple choice in every unit', () => {
    for (const u of UNITS) expect(u.items.filter((i) => i.kind !== 'cloze').length).toBeGreaterThanOrEqual(4)
  })
})
