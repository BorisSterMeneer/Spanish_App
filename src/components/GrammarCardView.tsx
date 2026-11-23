import type { GrammarCard, Settings } from '../types'
import { speak } from '../lib/speech'

export function GrammarCardView({ card, settings }: { card: GrammarCard; settings: Settings }) {
  const blocks: ({ kind: 'p'; text: string } | { kind: 'table'; rows: string[][] })[] = []
  for (const line of card.body) {
    if (line.startsWith('| ')) {
      const cells = line.slice(2).split(' | ')
      const last = blocks[blocks.length - 1]
      if (last && last.kind === 'table') last.rows.push(cells)
      else blocks.push({ kind: 'table', rows: [cells] })
    } else blocks.push({ kind: 'p', text: line })
  }
  return (
    <div className="grammar">
      <h2>{card.title}</h2>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i}>{b.text}</p>
        ) : (
          <table key={i}>
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j}>
                  {r.map((c, k) => (
                    <td key={k}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ),
      )}
      <h3>Examples</h3>
      <ul className="examples">
        {card.examples.map((e) => (
          <li key={e.es}>
            <button className="icon" aria-label="Play" onClick={() => speak(e.es, settings)}>
              🔊
            </button>
            <div>
              <div className="es">{e.es}</div>
              <div className="en">{e.en}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
