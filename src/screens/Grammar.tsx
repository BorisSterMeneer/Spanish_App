import { useState } from 'react'
import type { Settings } from '../types'
import { UNITS } from '../content/curriculum'
import { GrammarCardView } from '../components/GrammarCardView'

export function Grammar({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="screen">
      <header className="top">
        <button className="icon" onClick={onBack} aria-label="Back">←</button>
        <h2>Grammar</h2>
      </header>
      {UNITS.map((u, i) => (
        <div key={u.id} className="card">
          <button className="unit-head" onClick={() => setOpen(open === u.id ? null : u.id)}>
            <span>
              {i + 1}. {u.title}
            </span>
            <span>{open === u.id ? '−' : '+'}</span>
          </button>
          {open === u.id && <GrammarCardView card={u.grammar} settings={settings} />}
        </div>
      ))}
    </div>
  )
}
