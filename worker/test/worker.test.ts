import { describe, expect, it } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { handle, type Env } from '../src/index'

const env: Env = { ANTHROPIC_API_KEY: 'sk-test', APP_TOKEN: 'secret-token', ALLOWED_ORIGIN: 'https://me.github.io', MODEL: 'claude-opus-5-5' }

function fakeClient(reply: unknown, capture: { params?: Record<string, unknown> }) {
  return {
    beta: {
      messages: {
        parse: async (params: Record<string, unknown>) => {
          capture.params = params
          return { stop_reason: 'end_turn', parsed_output: reply }
        },
      },
    },
  } as unknown as Anthropic
}

const ctx = { units: ['Greetings'], knownWords: ['hola'], topic: 'café' }
const req = (body: unknown, token = 'secret-token') =>
  new Request('https://w.example/chat', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, origin: 'https://me.github.io', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('worker', () => {
  it('rejects a wrong token', async () => {
    const r = await handle(req({ messages: [], context: ctx }, 'nope'), env, fakeClient({}, {}))
    expect(r.status).toBe(401)
  })

  it('answers CORS preflight for the allowed origin', async () => {
    const r = await handle(new Request('https://w.example/chat', { method: 'OPTIONS', headers: { origin: 'https://ME.github.io' } }), env)
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-origin')).toBe('https://ME.github.io')
  })

  it('starts a conversation and keeps roles alternating', async () => {
    const cap: { params?: Record<string, unknown> } = {}
    const reply = { reply_es: '¡Hola! ¿Qué tomas?', translation_en: 'Hi! What are you having?', corrections: [] }
    const r = await handle(req({ messages: [], context: ctx }), env, fakeClient(reply, cap))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual(reply)
    const msgs = cap.params!.messages as { role: string; content: string }[]
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toContain('café')
    expect(cap.params!.model).toBe('claude-opus-5-5')
    expect(cap.params!.fallbacks).toBe('default')
  })

  it('keeps the tutor opening question in history', async () => {
    const cap: { params?: Record<string, unknown> } = {}
    const history = [
      { role: 'assistant', content: '¡Hola! ¿Qué tomas?' },
      { role: 'user', content: 'Yo quiero un café' },
    ]
    await handle(req({ messages: history, context: ctx }), env, fakeClient({ reply_es: 'x', translation_en: 'x', corrections: [] }, cap))
    const msgs = cap.params!.messages as { role: string }[]
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
  })

  it('omits fallbacks for models that do not support them', async () => {
    const cap: { params?: Record<string, unknown> } = {}
    await handle(req({ messages: [], context: ctx }), { ...env, MODEL: 'claude-haiku-5-5' }, fakeClient({ reply_es: 'x', translation_en: 'x', corrections: [] }, cap))
    expect(cap.params!.fallbacks).toBeUndefined()
    expect(cap.params!.betas).toBeUndefined()
  })

  it('rejects oversized bodies', async () => {
    const r = await handle(req({ messages: [{ role: 'user', content: 'x'.repeat(5000) }], context: ctx }), env, fakeClient({}, {}))
    expect(r.status).toBe(400)
  })
})
