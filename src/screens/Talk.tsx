import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'
import { aiConfigured, sendChat, type ChatTurn, type Correction, type LearnerContext } from '../lib/ai'
import { getAllCards } from '../lib/db'
import { ITEM_BY_ID, UNIT_OF_ITEM } from '../content/curriculum'
import { listen, speak, sttSupported } from '../lib/speech'

const TOPICS = [
  'Introduce yourself (name, where you are from, your job)',
  'Ordering a coffee and something to eat in a café',
  'Your family and your home',
  'What you like and do not like',
  'Free conversation',
]

interface Msg {
  role: 'user' | 'assistant'
  text: string
  translation?: string
  corrections?: Correction[]
}

export function Talk({ settings, onBack, onSettings }: { settings: Settings; onBack: () => void; onSettings: () => void }) {
  const [topic, setTopic] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [showEn, setShowEn] = useState<Record<number, boolean>>({})
  const [autoSpeak, setAutoSpeak] = useState(true)
  const ctxRef = useRef<LearnerContext | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const stopRef = useRef<() => void>(() => {})

  useEffect(() => {
    void getAllCards().then((cards) => {
      const words = new Set<string>()
      const units = new Set<string>()
      for (const c of cards) {
        const item = ITEM_BY_ID.get(c.itemId)
        if (!item) continue
        units.add(UNIT_OF_ITEM.get(item.id)!.title)
        if (item.kind !== 'cloze' && item.kind !== 'sentence') words.add(item.es)
      }
      ctxRef.current = { units: [...units], knownWords: [...words].slice(0, 200), topic: '' }
    })
  }, [])

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, busy])

  if (!aiConfigured(settings)) {
    return (
      <div className="screen">
        <header className="top">
          <button className="icon" onClick={onBack} aria-label="Back">←</button>
          <h2>Talk</h2>
        </header>
        <div className="card">
          <p>
            Conversation practice uses Claude through your own small proxy (a free Cloudflare Worker), so your API key
            never lives on this phone.
          </p>
          <p>
            Follow the setup steps in the project README (<em>AI conversation setup</em>), then paste the Worker URL and
            your app token in Settings.
          </p>
          <button className="primary wide" onClick={onSettings}>Open settings</button>
        </div>
      </div>
    )
  }

  async function send(history: Msg[], t: string) {
    setBusy(true)
    setError(null)
    try {
      const turns: ChatTurn[] = history.map((m) => ({ role: m.role, content: m.text }))
      const ctx = { ...(ctxRef.current ?? { units: [], knownWords: [], topic: '' }), topic: t }
      const r = await sendChat(settings, turns, ctx)
      const next = [...history]
      // Attach corrections to the last user message.
      const lastUser = next.map((m) => m.role).lastIndexOf('user')
      if (lastUser >= 0 && r.corrections?.length) next[lastUser] = { ...next[lastUser], corrections: r.corrections }
      next.push({ role: 'assistant', text: r.reply_es, translation: r.translation_en })
      setMsgs(next)
      if (autoSpeak) void speak(r.reply_es, settings)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function start(t: string) {
    setTopic(t)
    setMsgs([])
    void send([], t)
  }

  function submit(text: string) {
    const v = text.trim()
    if (!v || busy || !topic) return
    const history = [...msgs, { role: 'user' as const, text: v }]
    setMsgs(history)
    setInput('')
    void send(history, topic)
  }

  async function mic() {
    if (listening) {
      stopRef.current()
      return
    }
    setError(null)
    setListening(true)
    const l = listen(settings.voiceLang)
    stopRef.current = l.stop
    try {
      const alts = await l.result
      if (alts[0]) submit(alts[0])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setListening(false)
    }
  }

  return (
    <div className="screen talk">
      <header className="top">
        <button className="icon" onClick={onBack} aria-label="Back">←</button>
        <h2>Talk</h2>
        <label className="toggle small">
          <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> read aloud
        </label>
      </header>

      {!topic ? (
        <div className="card">
          <p>Pick a topic. The tutor speaks simple Spanish at your level and corrects your mistakes.</p>
          {TOPICS.map((t) => (
            <button key={t} className="opt" onClick={() => start(t)}>{t}</button>
          ))}
        </div>
      ) : (
        <>
          <div className="chat">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="bubble">
                  <span className="es">{m.text}</span>
                  {m.role === 'assistant' && (
                    <span className="msg-tools">
                      <button className="icon" aria-label="Play" onClick={() => speak(m.text, settings)}>🔊</button>
                      <button className="icon" aria-label="Translate" onClick={() => setShowEn((s) => ({ ...s, [i]: !s[i] }))}>EN</button>
                    </span>
                  )}
                  {showEn[i] && m.translation && <div className="en small">{m.translation}</div>}
                </div>
                {m.corrections && m.corrections.length > 0 && (
                  <div className="corrections">
                    {m.corrections.map((c, j) => (
                      <div key={j} className="correction">
                        <s>{c.original}</s> → <strong>{c.corrected}</strong>
                        <div className="small">{c.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="msg assistant"><div className="bubble">…</div></div>}
            {error && <div className="error">{error}</div>}
            <div ref={endRef} />
          </div>
          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); submit(input) }}>
            {sttSupported && (
              <button type="button" className={listening ? 'mic on' : 'mic'} onClick={mic} disabled={busy}>
                {listening ? '●' : '🎤'}
              </button>
            )}
            <input value={input} onChange={(e) => setInput(e.target.value)} lang="es" placeholder="Escribe en español…" disabled={busy} />
            <button type="submit" className="primary" disabled={busy || !input.trim()}>➤</button>
          </form>
          <button className="link" onClick={() => setTopic(null)}>New topic</button>
        </>
      )}
    </div>
  )
}
