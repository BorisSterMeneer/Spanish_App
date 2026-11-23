import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExerciseType, Settings } from '../types'
import type { Verdict } from '../lib/answer'
import { addLog, addPracticeSeconds, getAllCards, getSeenGrammar, markGrammarSeen, putCards } from '../lib/db'
import { SessionEngine, type Task } from '../lib/session'
import { verdictToRating } from '../lib/srs'
import { UNITS } from '../content/curriculum'
import { speak, sttSupported, ttsSupported } from '../lib/speech'
import { Exercise } from '../components/Exercise'
import { GrammarCardView } from '../components/GrammarCardView'

interface Stats {
  answered: number
  correct: number
  newItems: number
}

export function Session({ settings, onExit, unitId = null }: { settings: Settings; onExit: () => void; unitId?: string | null }) {
  const engineRef = useRef<SessionEngine | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [taskKey, setTaskKey] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [extraSeconds, setExtraSeconds] = useState(0)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({ answered: 0, correct: 0, newItems: 0 })
  const unsaved = useRef(0)

  const unitTitle = unitId ? UNITS.find((u) => u.id === unitId)?.title : null
  const limit = settings.sessionMinutes * 60 + extraSeconds
  const timeUp = elapsed >= limit

  // ---- load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cards, seen] = await Promise.all([getAllCards(), getSeenGrammar()])
        if (cancelled) return
        const e = new SessionEngine(cards, seen, settings, { tts: ttsSupported, stt: sttSupported }, Math.random, unitId)
        engineRef.current = e
        setTask(e.next(Date.now()))
      } catch (err) {
        setError((err as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- timer: counts only while the page is visible and the session is running
  useEffect(() => {
    if (finished) return
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setElapsed((s) => s + 1)
      unsaved.current += 1
    }, 1000)
    return () => clearInterval(id)
  }, [finished])

  const flush = useCallback(async () => {
    const s = unsaved.current
    unsaved.current = 0
    await addPracticeSeconds(s)
  }, [])

  // Save practice time when leaving / backgrounding the app.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      void flush()
    }
  }, [flush])

  function advance() {
    const e = engineRef.current!
    if (timeUp) {
      setFinished(true)
      void flush()
      return
    }
    setTask(e.next(Date.now()))
    setTaskKey((k) => k + 1)
  }

  async function onGrammarDone(unitId: string) {
    engineRef.current!.markGrammarSeen(unitId)
    await markGrammarSeen(unitId)
    setTask(engineRef.current!.next(Date.now()))
    setTaskKey((k) => k + 1)
  }

  async function onIntroDone() {
    if (task?.type !== 'intro') return
    const created = engineRef.current!.introduce(task.item, Date.now())
    await putCards(created)
    setStats((s) => ({ ...s, newItems: s.newItems + 1 }))
    advance()
  }

  async function onAnswer(verdict: Verdict, exercise: ExerciseType) {
    if (task?.type !== 'exercise') return
    const now = Date.now()
    const wasNew = task.card.reps === 0 && task.card.mode === 'cloze'
    const updated = engineRef.current!.answer(task.card.id, verdict, now)
    await putCards([updated])
    await addLog({ cardId: updated.id, ts: now, rating: verdictToRating(verdict), exercise, correct: verdict !== 'wrong' })
    await flush()
    setStats((s) => ({
      answered: s.answered + 1,
      correct: s.correct + (verdict === 'wrong' ? 0 : 1),
      newItems: s.newItems + (wasNew ? 1 : 0),
    }))
    advance()
  }

  if (error) return <div className="screen"><p className="error">{error}</p><button onClick={onExit}>Back</button></div>

  if (finished) {
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    return (
      <div className="screen summary">
        <h2>¡Bien hecho!</h2>
        <p className="big">
          {mins} min {secs > 0 ? `${secs} s` : ''}
        </p>
        <ul className="stat-list">
          <li><strong>{stats.answered}</strong> exercises</li>
          <li><strong>{stats.answered ? Math.round((100 * stats.correct) / stats.answered) : 0}%</strong> correct</li>
          <li><strong>{stats.newItems}</strong> new words and drills</li>
        </ul>
        <div className="row">
          <button
            className="secondary"
            onClick={() => {
              setExtraSeconds((x) => x + 5 * 60)
              setFinished(false)
              setTask(engineRef.current!.next(Date.now()))
              setTaskKey((k) => k + 1)
            }}
          >
            5 more minutes
          </button>
          <button className="primary" onClick={onExit}>Done</button>
        </div>
      </div>
    )
  }

  const remaining = Math.max(0, limit - elapsed)
  const pct = Math.min(100, (elapsed / limit) * 100)

  return (
    <div className="screen session">
      <header className="session-bar">
        <button className="icon" aria-label="Quit" onClick={() => { void flush(); onExit() }}>✕</button>
        <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        <span className="clock">{timeUp ? 'last one' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}</span>
      </header>

      {unitTitle && <div className="small center">Practising: {unitTitle}</div>}
      {!task && <p>Loading…</p>}

      {task?.type === 'grammar' && (
        <div className="card">
          <div className="prompt-label">New grammar · {task.unit.title}</div>
          <GrammarCardView card={task.unit.grammar} settings={settings} />
          <button className="primary wide" onClick={() => onGrammarDone(task.unit.id)}>Got it</button>
        </div>
      )}

      {task?.type === 'intro' && (
        <IntroCard key={taskKey} task={task} settings={settings} onDone={onIntroDone} />
      )}

      {task?.type === 'exercise' && (
        <div className="card">
          <Exercise
            key={taskKey}
            item={task.item}
            card={task.card}
            exercise={task.exercise}
            settings={settings}
            cards={engineRef.current!.cards}
            onDone={onAnswer}
          />
        </div>
      )}
    </div>
  )
}

function IntroCard({ task, settings, onDone }: { task: Extract<Task, { type: 'intro' }>; settings: Settings; onDone: () => void }) {
  const { item } = task
  useEffect(() => {
    if (settings.enableListening) speak(item.es, settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])
  return (
    <div className="card intro">
      <div className="prompt-label">New {item.kind}</div>
      <div className="big es">
        {item.es}{' '}
        <button className="icon" aria-label="Play" onClick={() => speak(item.es, settings)}>🔊</button>
      </div>
      <div className="big en">{item.en}</div>
      {item.alts && item.alts.length > 0 && <div className="small">Also: {item.alts.join(', ')}</div>}
      {item.note && <div className="note">{item.note}</div>}
      <button className="primary wide" onClick={onDone} autoFocus>Continue</button>
    </div>
  )
}
