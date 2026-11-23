import { useEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseType, Item, Settings, StoredCard } from '../types'
import { checkAnswer, checkSpoken, type Verdict } from '../lib/answer'
import { acceptedSpanish, clozeOptions, mcOptions } from '../lib/session'
import { listen, speak, sttSupported, ttsSupported } from '../lib/speech'

interface Props {
  item: Item
  card: StoredCard
  exercise: ExerciseType
  settings: Settings
  cards: Map<string, StoredCard>
  onDone: (verdict: Verdict, exercise: ExerciseType) => void
}

interface Feedback {
  verdict: Verdict
  expected: string
  given?: string
  heard?: string
  overridable: boolean
}

const ACCENTS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡']

const PROMPTS: Record<ExerciseType, string> = {
  'mc-meaning': 'What does this mean?',
  'mc-spanish': 'Choose the Spanish',
  'listen-meaning': 'Listen. What does it mean?',
  'type-spanish': 'Write this in Spanish',
  dictation: 'Write what you hear',
  speak: 'Say this in Spanish',
  'cloze-mc': 'Fill the gap',
  'cloze-type': 'Type the missing word',
}

export function Exercise({ item, card, exercise: initialExercise, settings, cards, onDone }: Props) {
  const [exercise, setExercise] = useState(initialExercise)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const stopRef = useRef<() => void>(() => {})

  const options = useMemo(() => {
    if (exercise === 'mc-meaning' || exercise === 'listen-meaning') return mcOptions(item, 'en', cards)
    if (exercise === 'mc-spanish') return mcOptions(item, 'es', cards)
    if (exercise === 'cloze-mc') return clozeOptions(item)
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, exercise])

  const audioOnly = exercise === 'listen-meaning' || exercise === 'dictation'

  useEffect(() => {
    if (audioOnly) speak(item.es, settings)
    if (exercise === 'type-spanish' || exercise === 'dictation' || exercise === 'cloze-type') inputRef.current?.focus()
    return () => stopRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, exercise])

  function finish(f: Feedback) {
    setFeedback(f)
    if (settings.enableListening && ttsSupported) speak(item.es, settings)
  }

  function choose(opt: string) {
    if (feedback) return
    const correct =
      exercise === 'mc-spanish' ? item.es : exercise === 'cloze-mc' ? item.answer! : item.en
    finish({ verdict: opt === correct ? 'correct' : 'wrong', expected: correct, given: opt, overridable: false })
  }

  function submitTyped() {
    if (feedback || !input.trim()) return
    const accepted = acceptedSpanish(item)
    // Cloze answers ARE the grammar point, so no typo tolerance there.
    const r = checkAnswer(input, accepted, { allowTypo: item.kind !== 'cloze' })
    finish({ verdict: r.verdict, expected: exercise === 'cloze-type' ? item.answer! : item.es, given: input, overridable: r.verdict !== 'correct' && r.verdict !== 'accent' })
  }

  async function startListening() {
    setMicError(null)
    setListening(true)
    const l = listen(settings.voiceLang)
    stopRef.current = l.stop
    try {
      const alts = await l.result
      setListening(false)
      if (!alts.length) {
        setMicError("I didn't hear anything. Try again.")
        return
      }
      const r = checkSpoken(alts, acceptedSpanish(item))
      finish({ verdict: r.verdict, expected: item.es, heard: r.heard, overridable: r.verdict === 'wrong' })
    } catch (e) {
      setListening(false)
      setMicError((e as Error).message)
    }
  }

  function cont(override = false) {
    if (!feedback) return
    onDone(override ? 'correct' : feedback.verdict, exercise)
  }

  const isCloze = exercise === 'cloze-mc' || exercise === 'cloze-type'
  const typed = exercise === 'type-spanish' || exercise === 'dictation' || exercise === 'cloze-type'

  return (
    <div className="exercise">
      <div className="prompt-label">{PROMPTS[exercise]}</div>

      {/* ---------- stimulus ---------- */}
      {isCloze ? (
        <div className="stimulus">
          <div className="big es">
            {item.cloze!.split('___').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="gap">{feedback ? item.answer : '____'}</span>}
              </span>
            ))}
          </div>
          {item.hint && <div className="hint">({item.hint})</div>}
          <div className="en small">{item.en}</div>
        </div>
      ) : audioOnly ? (
        <div className="stimulus">
          <div className="audio-buttons">
            <button className="play" onClick={() => speak(item.es, settings)}>🔊 Play</button>
            <button className="play secondary" onClick={() => speak(item.es, settings, 0.6)}>🐢 Slow</button>
          </div>
          {feedback && <div className="big es">{item.es}</div>}
        </div>
      ) : exercise === 'mc-meaning' ? (
        <div className="stimulus">
          <div className="big es">
            {item.es}{' '}
            <button className="icon" aria-label="Play" onClick={() => speak(item.es, settings)}>🔊</button>
          </div>
        </div>
      ) : (
        <div className="stimulus">
          <div className="big en">{item.en}</div>
        </div>
      )}

      {/* ---------- response ---------- */}
      {options.length > 0 && (
        <div className="options">
          {options.map((o) => {
            const correct = exercise === 'mc-spanish' ? item.es : exercise === 'cloze-mc' ? item.answer : item.en
            const cls = feedback ? (o === correct ? 'opt right' : o === feedback.given ? 'opt wrong' : 'opt dim') : 'opt'
            return (
              <button key={o} className={cls} onClick={() => choose(o)} disabled={!!feedback}>
                {o}
              </button>
            )
          })}
        </div>
      )}

      {typed && (
        <form
          className="typed"
          onSubmit={(e) => {
            e.preventDefault()
            submitTyped()
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!!feedback}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            lang="es"
            placeholder="Escribe aquí…"
          />
          {!feedback && (
            <>
              <div className="accents">
                {ACCENTS.map((a) => (
                  <button
                    type="button"
                    key={a}
                    onClick={() => {
                      setInput((v) => v + a)
                      inputRef.current?.focus()
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <button type="submit" className="primary" disabled={!input.trim()}>
                Check
              </button>
            </>
          )}
        </form>
      )}

      {exercise === 'speak' && !feedback && (
        <div className="speak">
          <button className={listening ? 'mic on' : 'mic'} onClick={listening ? () => stopRef.current() : startListening} disabled={!sttSupported}>
            {listening ? '● Listening… tap to stop' : '🎤 Tap and speak'}
          </button>
          {micError && <div className="error">{micError}</div>}
          <button className="link" onClick={() => setExercise('type-spanish')}>
            Can't speak now? Type it instead
          </button>
        </div>
      )}

      {/* ---------- feedback ---------- */}
      {feedback && (
        <div className={`feedback ${feedback.verdict === 'wrong' ? 'bad' : feedback.verdict === 'correct' ? 'good' : 'meh'}`}>
          <div className="verdict">
            {feedback.verdict === 'correct' && '✓ Correct'}
            {feedback.verdict === 'accent' && '✓ Correct, but check the accents'}
            {feedback.verdict === 'typo' && (exercise === 'speak' ? '≈ Almost' : '≈ Almost: small typo')}
            {feedback.verdict === 'wrong' && '✗ Not quite'}
          </div>
          {feedback.heard !== undefined && (
            <div className="line">
              I heard: <em>{feedback.heard}</em>
            </div>
          )}
          {feedback.verdict !== 'correct' && (
            <div className="line">
              Answer: <strong className="es">{feedback.expected}</strong>
            </div>
          )}
          {!audioOnly && !isCloze && exercise !== 'mc-meaning' && (
            <div className="line small">
              {item.es} = {item.en}
            </div>
          )}
          {audioOnly && <div className="line small">{item.en}</div>}
          {item.note && <div className="note">{item.note}</div>}
          <div className="row">
            {feedback.overridable && (
              <button className="secondary" onClick={() => cont(true)}>
                I was right
              </button>
            )}
            <button className="primary" onClick={() => cont()} autoFocus>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
