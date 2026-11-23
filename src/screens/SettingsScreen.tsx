import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'
import { exportAll, importAll, resetAll, saveSettings, validateBackup } from '../lib/db'
import { loadVoices, speak, spanishVoices, sttSupported, ttsSupported } from '../lib/speech'

export function SettingsScreen({ settings, onChange, onBack }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadVoices().then((v) => setVoices(spanishVoices(v)))
  }, [])

  function update<K extends keyof Settings>(k: K, v: Settings[K]) {
    const next = { ...settings, [k]: v }
    onChange(next)
    void saveSettings(next)
  }

  async function doExport() {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const name = `spanish-backup-${new Date().toISOString().slice(0, 10)}.json`
    const file = new File([blob], name, { type: 'application/json' })
    // On Android, the share sheet lets you save to Drive / send to yourself.
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name })
        return
      } catch {
        /* cancelled: fall back to download */
      }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function doImport(f: File) {
    try {
      const data: unknown = JSON.parse(await f.text())
      if (!validateBackup(data)) throw new Error('This is not a Spanish app backup file.')
      if (!confirm(`Replace all progress on this device with the backup from ${data.exportedAt.slice(0, 10)}?`)) return
      await importAll(data)
      setMsg('Backup restored. Reloading…')
      setTimeout(() => location.reload(), 800)
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  async function doReset() {
    if (!confirm('Delete all progress on this device? Settings are kept. This cannot be undone.')) return
    await resetAll()
    setMsg('Progress deleted.')
  }

  return (
    <div className="screen settings">
      <header className="top">
        <button className="icon" onClick={onBack} aria-label="Back">←</button>
        <h2>Settings</h2>
      </header>

      <section className="card">
        <h3>Session</h3>
        <label>
          Session length (minutes)
          <input type="number" min={3} max={60} value={settings.sessionMinutes} onChange={(e) => update('sessionMinutes', clamp(+e.target.value, 3, 60))} />
        </label>
        <label>
          Max new words / drills per session
          <input type="number" min={0} max={40} value={settings.newPerSession} onChange={(e) => update('newPerSession', clamp(+e.target.value, 0, 40))} />
        </label>
      </section>

      <section className="card">
        <h3>Voice</h3>
        {!ttsSupported && <p className="error">This browser has no text-to-speech.</p>}
        <label>
          Accent
          <select value={settings.voiceLang} onChange={(e) => update('voiceLang', e.target.value as Settings['voiceLang'])}>
            <option value="es-ES">Spain (es-ES)</option>
            <option value="es-MX">Mexico (es-MX)</option>
          </select>
        </label>
        <label>
          Voice
          <select value={settings.voiceName ?? ''} onChange={(e) => update('voiceName', e.target.value || null)}>
            <option value="">Automatic</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
        <label>
          Speed {settings.speechRate.toFixed(2)}
          <input type="range" min={0.5} max={1.2} step={0.05} value={settings.speechRate} onChange={(e) => update('speechRate', +e.target.value)} />
        </label>
        <button onClick={() => speak('Hola, ¿qué tal? Me llamo Lucía y vivo en Madrid.', settings)}>Test voice</button>
        <label className="toggle">
          <input type="checkbox" checked={settings.enableListening} onChange={(e) => update('enableListening', e.target.checked)} /> Listening exercises and audio
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.enableSpeaking} onChange={(e) => update('enableSpeaking', e.target.checked)} disabled={!sttSupported} />{' '}
          Speaking exercises {sttSupported ? '' : '(not supported in this browser)'}
        </label>
      </section>

      <section className="card">
        <h3>AI conversation</h3>
        <p className="small">Optional. See "AI conversation setup" in the README.</p>
        <label>
          Worker URL
          <input type="url" placeholder="https://spanish-tutor.<you>.workers.dev" value={settings.aiWorkerUrl} onChange={(e) => update('aiWorkerUrl', e.target.value)} />
        </label>
        <label>
          App token
          <input type="password" value={settings.aiToken} onChange={(e) => update('aiToken', e.target.value)} autoComplete="off" />
        </label>
      </section>

      <section className="card">
        <h3>Backup</h3>
        <p className="small">Progress is stored only on this device. Export now and then so you don't lose it.</p>
        <div className="row">
          <button onClick={doExport}>Export backup</button>
          <button onClick={() => fileRef.current?.click()}>Import backup</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        <button className="danger" onClick={doReset}>Delete all progress</button>
        {msg && <p>{msg}</p>}
      </section>

      <p className="small center">Version {__APP_VERSION__}</p>
    </div>
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : lo
}
