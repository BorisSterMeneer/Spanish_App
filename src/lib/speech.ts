import type { Settings } from '../types'

// ------------------------------------------------------------ text-to-speech

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

let voicesCache: SpeechSynthesisVoice[] = []

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) {
    voicesCache = now
    return Promise.resolve(now)
  }
  // Chrome loads voices asynchronously.
  return new Promise((resolve) => {
    const done = () => {
      voicesCache = speechSynthesis.getVoices()
      resolve(voicesCache)
    }
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

export function spanishVoices(voices = voicesCache): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('es'))
}

function pickVoice(s: Settings): SpeechSynthesisVoice | undefined {
  const es = spanishVoices()
  if (s.voiceName) {
    const v = es.find((x) => x.name === s.voiceName)
    if (v) return v
  }
  const norm = (l: string) => l.toLowerCase().replace('_', '-')
  return es.find((v) => norm(v.lang) === s.voiceLang.toLowerCase()) ?? es[0]
}

export function speak(text: string, s: Settings, rate = s.speechRate): Promise<void> {
  if (!ttsSupported) return Promise.resolve()
  speechSynthesis.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice(s)
    if (v) u.voice = v
    u.lang = v?.lang ?? s.voiceLang
    u.rate = rate
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

// ------------------------------------------------------------ speech recognition

interface SRAlternative { transcript: string }
interface SRResultList { length: number; [i: number]: { length: number; [j: number]: SRAlternative } }
interface SREvent { results: SRResultList }
interface SR {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((e: SREvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type SRCtor = new () => SR

function srCtor(): SRCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const sttSupported = !!srCtor()

export interface Listening {
  result: Promise<string[]>
  stop(): void
}

/**
 * Listen for one utterance. Resolves with the recogniser's alternatives
 * (best first); an empty array means nothing was heard. Rejects on
 * permission / network errors.
 */
export function listen(lang: string): Listening {
  const Ctor = srCtor()
  if (!Ctor) return { result: Promise.reject(new Error('Speech recognition is not supported in this browser.')), stop() {} }
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = false
  rec.maxAlternatives = 5
  rec.continuous = false
  const result = new Promise<string[]>((resolve, reject) => {
    let got: string[] = []
    rec.onresult = (e) => {
      const r = e.results[0]
      got = []
      for (let i = 0; i < r.length; i++) got.push(r[i].transcript)
    }
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') resolve([])
      else reject(new Error(e.error === 'not-allowed' ? 'Microphone permission was denied.' : `Speech recognition error: ${e.error}`))
    }
    rec.onend = () => resolve(got)
  })
  rec.start()
  return { result, stop: () => rec.stop() }
}
