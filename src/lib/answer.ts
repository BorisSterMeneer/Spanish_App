/**
 * Answer checking for typed / spoken Spanish.
 *
 * Verdicts:
 *  - 'correct'  exact match (ignoring case, punctuation, spacing)
 *  - 'accent'   right except for accents / ñ; counts as correct but is flagged
 *  - 'typo'     one small slip (edit distance 1 on a longer answer); flagged, graded Hard
 *  - 'wrong'
 */
export type Verdict = 'correct' | 'accent' | 'typo' | 'wrong'

export interface CheckResult {
  verdict: Verdict
  /** The accepted answer closest to what the user gave (for feedback). */
  expected: string
}

const SUBJECT_PRONOUNS = [
  'yo', 'tu', 'tú', 'el', 'él', 'ella', 'usted', 'nosotros', 'nosotras',
  'vosotros', 'vosotras', 'ellos', 'ellas', 'ustedes',
]

/** Lowercase, drop punctuation (incl. ¿¡), collapse whitespace. Keeps accents. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[¿?¡!.,;:"“”«»()…]/g, ' ')
    .replace(/['’`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Remove accents and ñ→n (after normalize). */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

function dropLeadingPronoun(s: string): string | null {
  const first = s.split(' ')[0]
  if (SUBJECT_PRONOUNS.includes(first) && s.includes(' ')) return s.slice(first.length + 1)
  return null
}

/**
 * Expand the accepted answers: Spanish usually drops subject pronouns, so
 * "Soy estudiante" and "Yo soy estudiante" are both fine. We accept the
 * target without its pronoun. We do NOT accept an added pronoun the target
 * lacks unless it's listed, because "él es…" vs "ella es…" would then be
 * ambiguous.
 */
function variants(accepted: string[]): string[] {
  const out = new Set<string>()
  for (const a of accepted) {
    const n = normalize(a)
    if (!n) continue
    out.add(n)
    const d = dropLeadingPronoun(n)
    if (d) out.add(d)
  }
  return [...out]
}

export function checkAnswer(given: string, accepted: string[], opts: { allowTypo?: boolean } = {}): CheckResult {
  const allowTypo = opts.allowTypo ?? true
  const g = normalize(given)
  const vs = variants(accepted)
  const first = accepted[0] ?? ''
  if (!g) return { verdict: 'wrong', expected: first }

  for (const v of vs) if (v === g) return { verdict: 'correct', expected: v }

  const gs = stripAccents(g)
  for (const v of vs) if (stripAccents(v) === gs) return { verdict: 'accent', expected: v }

  if (allowTypo) {
    for (const v of vs) if (isHarmlessTypo(gs, stripAccents(v))) return { verdict: 'typo', expected: v }
  }
  return { verdict: 'wrong', expected: closest(g, accepted) }
}

/**
 * A slip is only forgiven if it can't be a grammar mistake. In Spanish the
 * grammar lives in word endings (hablo/habla/hablas, alto/alta) and short
 * words (el/la, me/te), so we only accept: exactly one word differs, by one
 * edit, the word has 5+ letters, and its last 4 letters are intact
 * (-amos/-emos/-imos, -ado/-ada…).
 */
export function isHarmlessTypo(given: string, target: string): boolean {
  const gw = given.split(' ')
  const tw = target.split(' ')
  if (gw.length !== tw.length) return false
  let diff = -1
  for (let i = 0; i < tw.length; i++) {
    if (gw[i] !== tw[i]) {
      if (diff >= 0) return false
      diff = i
    }
  }
  if (diff < 0) return false
  const a = gw[diff]
  const b = tw[diff]
  if (b.length < 5 || levenshtein(a, b) !== 1) return false
  // Length of the common suffix: the edit must leave the last 4 letters intact.
  let suf = 0
  while (suf < a.length && suf < b.length && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++
  return suf >= 4
}

function closest(g: string, accepted: string[]): string {
  let best = accepted[0] ?? ''
  let bd = Infinity
  for (const a of accepted) {
    const d = levenshtein(normalize(a), g)
    if (d < bd) {
      bd = d
      best = a
    }
  }
  return best
}

/**
 * Speech recognition is fuzzier: it can drop accents, mishear one short
 * word, or add/omit a pronoun. Accept a transcript if, ignoring accents, it
 * is within ~15% character edit distance of an accepted answer.
 */
export function checkSpoken(transcripts: string[], accepted: string[]): CheckResult & { heard: string } {
  let bestHeard = transcripts[0] ?? ''
  let bestRatio = Infinity
  let bestExpected = accepted[0] ?? ''
  const vs = variants(accepted)
  for (const t of transcripts) {
    const g = stripAccents(normalize(t))
    for (const v of vs) {
      const vv = stripAccents(v)
      const ratio = levenshtein(vv, g) / Math.max(vv.length, 1)
      if (ratio < bestRatio) {
        bestRatio = ratio
        bestHeard = t
        bestExpected = v
      }
    }
  }
  const verdict: Verdict = bestRatio === 0 ? 'correct' : bestRatio <= 0.15 ? 'typo' : 'wrong'
  return { verdict, expected: bestExpected, heard: bestHeard }
}
