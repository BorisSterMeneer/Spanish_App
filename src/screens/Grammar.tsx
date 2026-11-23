import { useEffect, useState } from 'react'
import type { Settings } from '../types'
import { UNITS } from '../content/curriculum'
import { GrammarCardView } from '../components/GrammarCardView'
import { getAllCards } from '../lib/db'

/** Unit list: read any grammar card, or practise a unit on demand. */
export function Grammar({ settings, onBack, onPractise }: { settings: Settings; onBack: () => void; onPractise: (unitId: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [started, setStarted] = useState<Set<string>>(new Set())

  useEffect(() => {
    void getAllCards().then((cards) => setStarted(new Set(cards.map((c) => c.itemId))))
  }, [])

  return (
    <div className="screen">
      <header className="top">
        <button className="icon" onClick={onBack} aria-label="Back">←</button>
        <h2>Units</h2>
      </header>
      <p className="small">
        Practise any unit as often as you like. Practice counts toward today's minutes and updates your reviews. Practising a
        unit you haven't reached yet starts it early.
      </p>
      {UNITS.map((u, i) => {
        const done = u.items.filter((it) => started.has(it.id)).length
        return (
          <div key={u.id} className="card">
            <div className="unit-row">
              <button className="unit-head" onClick={() => setOpen(open === u.id ? null : u.id)}>
                <span>
                  {i + 1}. {u.title}
                </span>
                <span className="small">
                  {done}/{u.items.length} {open === u.id ? '−' : '+'}
                </span>
              </button>
            </div>
            <div className="row">
              <button onClick={() => setOpen(open === u.id ? null : u.id)}>📖 Grammar</button>
              <button className="primary" onClick={() => onPractise(u.id)}>
                {done === 0 ? 'Start early' : 'Practise'}
              </button>
            </div>
            {open === u.id && <GrammarCardView card={u.grammar} settings={settings} />}
          </div>
        )
      })}
    </div>
  )
}
