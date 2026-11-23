import { useEffect, useState } from 'react'
import type { Settings } from './types'
import { getSettings } from './lib/db'
import { loadVoices } from './lib/speech'
import { Home, type Screen } from './screens/Home'
import { Session } from './screens/Session'
import { Grammar } from './screens/Grammar'
import { Talk } from './screens/Talk'
import { SettingsScreen } from './screens/SettingsScreen'

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [homeKey, setHomeKey] = useState(0)

  useEffect(() => {
    void getSettings().then(setSettings)
    void loadVoices()
    // Ask the browser not to evict our IndexedDB data under storage pressure.
    void navigator.storage?.persist?.()
  }, [])

  // Android back button / gesture returns to home instead of leaving the app.
  useEffect(() => {
    if (screen === 'home') return
    history.pushState({ screen }, '')
    const onPop = () => {
      setHomeKey((k) => k + 1)
      setScreen('home')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [screen])

  if (!settings) return <div className="screen">Cargando…</div>

  const home = () => {
    // Pop the entry we pushed; the popstate handler switches to home.
    if ((history.state as { screen?: string } | null)?.screen) history.back()
    else {
      setHomeKey((k) => k + 1)
      setScreen('home')
    }
  }

  switch (screen) {
    case 'session':
      return <Session settings={settings} onExit={home} />
    case 'grammar':
      return <Grammar settings={settings} onBack={home} />
    case 'talk':
      return <Talk settings={settings} onBack={home} onSettings={() => setScreen('settings')} />
    case 'settings':
      return <SettingsScreen settings={settings} onChange={setSettings} onBack={home} />
    default:
      return <Home key={homeKey} settings={settings} go={setScreen} />
  }
}
