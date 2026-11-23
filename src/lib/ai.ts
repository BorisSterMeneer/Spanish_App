import type { Settings } from '../types'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface Correction {
  original: string
  corrected: string
  explanation: string
}

export interface TutorReply {
  reply_es: string
  translation_en: string
  corrections: Correction[]
}

export interface LearnerContext {
  units: string[]
  knownWords: string[]
  topic: string
}

export function aiConfigured(s: Settings): boolean {
  return /^https:\/\//.test(s.aiWorkerUrl.trim()) && s.aiToken.trim().length > 0
}

export async function sendChat(s: Settings, history: ChatTurn[], ctx: LearnerContext, signal?: AbortSignal): Promise<TutorReply> {
  const url = s.aiWorkerUrl.trim().replace(/\/+$/, '') + '/chat'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${s.aiToken.trim()}` },
    body: JSON.stringify({ messages: history, context: ctx }),
    signal,
  })
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const j = (await res.json()) as { error?: string }
      if (j.error) msg = j.error
    } catch {
      /* not JSON */
    }
    throw new Error(msg)
  }
  return (await res.json()) as TutorReply
}
