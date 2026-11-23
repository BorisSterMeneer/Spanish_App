/**
 * Spanish tutor proxy (Cloudflare Worker).
 *
 * Holds the Anthropic API key so it never lives on the phone. The app sends
 * the conversation + a short description of what the learner knows; the
 * Worker asks Claude for a JSON reply (Spanish answer, English translation,
 * corrections of the learner's last message).
 *
 * Secrets / vars (set with `npx wrangler secret put NAME`):
 *   ANTHROPIC_API_KEY  - from console.anthropic.com
 *   APP_TOKEN          - any long random string; paste the same value in the app's settings
 * Vars (wrangler.toml):
 *   ALLOWED_ORIGIN     - e.g. https://<you>.github.io
 *   MODEL              - Claude model id
 */
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

export interface Env {
  ANTHROPIC_API_KEY: string
  APP_TOKEN: string
  ALLOWED_ORIGIN: string
  MODEL: string
}

const TutorReply = z.object({
  reply_es: z.string().describe('Your reply, in Spanish only.'),
  translation_en: z.string().describe('English translation of reply_es.'),
  corrections: z
    .array(
      z.object({
        original: z.string().describe("The learner's incorrect fragment, quoted exactly."),
        corrected: z.string().describe('The corrected Spanish.'),
        explanation: z.string().describe('One short sentence in English explaining the rule.'),
      }),
    )
    .describe("Mistakes in the learner's LAST message only. Empty if there were none, or if there is no learner message yet."),
})
export type TutorReply = z.infer<typeof TutorReply>

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(60),
  context: z.object({
    units: z.array(z.string().max(200)).max(50),
    knownWords: z.array(z.string().max(100)).max(300),
    topic: z.string().max(300),
  }),
})

// Kept byte-stable (no dates, no per-request data) so it can be prompt-cached.
const SYSTEM = `You are a patient, friendly Spanish conversation partner for an adult beginner (CEFR A1) who is learning Castilian Spanish.

How to talk:
- Write ONLY simple Spanish in reply_es: short sentences (max ~12 words each), present tense, high-frequency words. Prefer the vocabulary and grammar the learner already knows (listed in the learner's profile message). A few new words are fine if the meaning is obvious from context.
- Keep each reply to 1-3 sentences and always end with one simple question so the conversation keeps going.
- Use tú, not usted.
- Stay on the chosen topic, but follow the learner if they change it.
- If the learner writes in English or seems lost, answer in very simple Spanish and model the sentence they probably wanted to say.

Corrections:
- Check only the learner's most recent message. List real errors (grammar, gender/number agreement, conjugation, wrong word, missing accent that changes meaning or spelling). Ignore missing ¿ ¡, capitalisation and punctuation.
- Do not correct anything in reply_es; just reply naturally. Never invent errors: if the message is correct, return an empty list.
- explanation: one short English sentence naming the rule (e.g. "Ser for professions: 'soy', not 'estoy'.").`

function profile(ctx: z.infer<typeof Body>['context']): string {
  return [
    `Topic for today: ${ctx.topic || 'free conversation'}`,
    `Units studied so far: ${ctx.units.length ? ctx.units.join('; ') : 'none yet (absolute beginner)'}`,
    `Words the learner has studied: ${ctx.knownWords.length ? ctx.knownWords.join(', ') : 'only greetings'}`,
  ].join('\n')
}

/** Models that accept server-side refusal fallbacks. */
function supportsFallbacks(model: string): boolean {
  return /^claude-(opus-5-5|sonnet-5-5|fable-5-[12]|opus-5$)/.test(model)
}

function cors(env: Env, origin: string | null): Record<string, string> {
  const allowed = env.ALLOWED_ORIGIN.split(',').map((s) => s.trim().toLowerCase())
  const ok = origin && (allowed.includes(origin.toLowerCase()) || allowed.includes('*'))
  return {
    'access-control-allow-origin': ok ? origin : allowed[0],
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'content-type': 'application/json' } })
}

/** Constant-time-ish string compare. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export async function handle(req: Request, env: Env, client?: Anthropic): Promise<Response> {
  const h = cors(env, req.headers.get('origin'))
  const url = new URL(req.url)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
  if (url.pathname === '/health') return json({ ok: true, model: env.MODEL }, 200, h)
  if (url.pathname !== '/chat' || req.method !== 'POST') return json({ error: 'Not found' }, 404, h)

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!env.APP_TOKEN || !safeEqual(token, env.APP_TOKEN)) return json({ error: 'Wrong app token.' }, 401, h)
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY is not set on the Worker.' }, 500, h)

  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await req.json())
  } catch {
    return json({ error: 'Bad request body.' }, 400, h)
  }

  // The first user turn carries the learner profile; the app's history
  // (which starts with the tutor's opening question) follows it.
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: 'user',
      content: `Learner profile:\n${profile(body.context)}\n\n(Start the conversation with a greeting and a first question about the topic.)`,
    },
    ...body.messages.slice(-30).map((m) => ({ role: m.role, content: m.content })),
  ]
  // Merge consecutive same-role turns (e.g. after a failed request) so roles alternate.
  for (let i = messages.length - 1; i > 0; i--) {
    if (messages[i].role === messages[i - 1].role) {
      messages[i - 1] = { role: messages[i].role, content: `${messages[i - 1].content as string}\n\n${messages[i].content as string}` }
      messages.splice(i, 1)
    }
  }
  if (messages[messages.length - 1].role !== 'user') return json({ error: 'The last message must be from the learner.' }, 400, h)

  const anthropic = client ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const model = env.MODEL || 'claude-opus-5-5'
  try {
    const res = await anthropic.beta.messages.parse({
      model,
      max_tokens: 4000,
      system: SYSTEM,
      cache_control: { type: 'ephemeral' },
      messages,
      output_config: { effort: 'low', format: betaZodOutputFormat(TutorReply) },
      ...(supportsFallbacks(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    })
    if (res.stop_reason === 'refusal') return json({ error: 'The model declined to answer. Try rephrasing.' }, 502, h)
    if (!res.parsed_output) return json({ error: 'The model returned an unexpected format. Try again.' }, 502, h)
    return json(res.parsed_output, 200, h)
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'The Anthropic API key on the Worker is invalid.' }, 502, h)
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Rate limited by the API. Wait a moment.' }, 429, h)
    if (e instanceof Anthropic.BadRequestError) return json({ error: `API rejected the request: ${e.message}` }, 502, h)
    if (e instanceof Anthropic.APIError) return json({ error: `API error: ${e.message}` }, 502, h)
    return json({ error: 'Worker error.' }, 500, h)
  }
}

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
}
