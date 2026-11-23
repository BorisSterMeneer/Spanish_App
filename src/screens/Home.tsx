import { useEffect, useState } from 'react'
import type { Settings, StoredCard } from '../types'
import { UNITS } from '../content/curriculum'
import { getAllCards, getPractice, dayKey } from '../lib/db'
import { lastDays, streakDays, totalMinutes } from '../lib/stats'
import { aiConfigured } from '../lib/ai'

export type Screen = 'home' | 'session' | 'grammar' | 'talk' | 'settings'

export function Home({ settings, go }: { settings: Settings; go: (s: Screen) => void }) {
  const [cards, setCards] = useState<StoredCard[] | null>(null)
  const [practice, setPractice] = useState<Record<string, number>>({})
  const [due, setDue] = useState(0)

  useEffect(() => {
    void getAllCards().then((c) => {
      const now = Date.now()
      setCards(c)
      setDue(c.filter((x) => x.due <= now).length)
    })
    void getPractice().then(setPractice)
  }, [])

  const started = new Set(cards?.map((c) => c.itemId) ?? [])
  const today = Math.floor((practice[dayKey()] ?? 0) / 60)
  const streak = streakDays(practice, settings.sessionMinutes)
  const days = lastDays(practice, 14)
  const maxMin = Math.max(settings.sessionMinutes, ...days.map((d) => d.minutes))

  const unitProgress = UNITS.map((u) => {
    const total = u.items.length
    const done = u.items.filter((i) => started.has(i.id)).length
    return { unit: u, total, done }
  })
  const current = unitProgress.find((p) => p.done < p.total) ?? unitProgress[unitProgress.length - 1]

  return (
    <div className="screen home">
      <h1>Español · 10 min</h1>

      <section className="today">
        <div className="today-num">
          <span className="big">{today}</span> / {settings.sessionMinutes} min today
        </div>
        <div className="sub">
          {streak > 0 ? `${streak}-day streak` : 'No streak yet'} · {totalMinutes(practice)} min total
        </div>
        <div className="bars" aria-label="Minutes per day, last 14 days">
          {days.map((d) => (
            <div key={d.key} className="bar" title={`${d.key}: ${d.minutes} min`}>
              <div
                className={d.minutes >= settings.sessionMinutes ? 'fill met' : 'fill'}
                style={{ height: `${(d.minutes / maxMin) * 100}%` }}
              />
            </div>
          ))}
        </div>
      </section>

      <button className="primary start" onClick={() => go('session')}>
        {today >= settings.sessionMinutes ? 'Practise again' : `Start ${settings.sessionMinutes}-minute session`}
      </button>
      <div className="sub center">
        {cards === null ? '' : cards.length === 0 ? 'Starts with unit 1 from zero.' : `${due} cards due for review`}
      </div>

      <section className="units">
        <h3>Course</h3>
        {unitProgress.map((p, i) => (
          <div key={p.unit.id} className={p === current ? 'unit current' : 'unit'}>
            <span className="num">{i + 1}</span>
            <span className="title">{p.unit.title}</span>
            <span className="frac">
              {p.done}/{p.total}
            </span>
          </div>
        ))}
      </section>

      <nav className="nav">
        <button onClick={() => go('grammar')}>📖 Units</button>
        <button onClick={() => go('talk')}>{aiConfigured(settings) ? '💬 Talk' : '💬 Talk (setup)'}</button>
        <button onClick={() => go('settings')}>⚙️ Settings</button>
      </nav>
    </div>
  )
}
