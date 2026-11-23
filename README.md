# Español · 10 min

A no-nonsense Spanish course for your phone. Ten minutes a day of real grammar,
vocabulary, listening and speaking. No hearts, gems, leagues or guilt-trip notifications.

- **Time-boxed sessions.** A session is 10 minutes (configurable), not N exercises. The app keeps
  serving exercises until the timer runs out, then lets you finish the one you're on. The streak
  counts days on which you practised your full session length.
- **Spaced repetition (FSRS).** Every word, phrase and drill is a card scheduled with
  [FSRS](https://github.com/open-spaced-repetition/ts-fsrs). Each session mixes due reviews with
  new material (max 12 new per session by default).
- **Explicit grammar.** Each unit opens with a short grammar card (tables + audio examples),
  followed by drills on exactly that rule. All grammar cards are browsable any time.
- **Fixed, hand-written A1 curriculum** (Castilian Spanish, with notes where Latin America differs):
  1. Greetings and introductions, tú vs usted
  2. Nouns, gender and articles
  3. Ser
  4. Estar (and ser vs estar)
  5. Regular -ar verbs, negation
  6. -er / -ir verbs, question words
  7. Tener, numbers, age, tener que
  8. Gustar
  9. Querer, poder and other stem-changing verbs
  10. Ir, ir a + infinitive, days of the week, telling the time
  11. Family and home, possessives (mi, tu, su, nuestro), hay
  12. Daily routine, reflexive verbs, frequency words
- **Practise any unit on demand** (Units screen): replay a unit you've done, or start one early.
  It counts toward today's minutes and updates your reviews.
- **Exercises get harder as you learn a card:** pick the meaning → pick the Spanish → type the
  Spanish → dictation (hear it, type it) / say it out loud. Fill-the-gap drills go from multiple
  choice to typing.
- **Fair answer checking.** Case and punctuation (¿ ¡) are ignored. Missing accents count as correct
  but are flagged. A one-letter slip in a long word is accepted as "almost", but never when it
  could be a grammar mistake (hablo/habla, alto/alta, el/la). There is an "I was right" button for
  the cases the checker gets wrong.
- **Audio** through the phone's built-in text-to-speech (Spain or Mexico voice), **speaking**
  through Chrome's speech recognition.
- **Local only.** Progress lives in IndexedDB on the phone. Export/import a backup file in Settings.
- **Optional AI conversation partner** (Claude), via a tiny Cloudflare Worker so the API key never
  sits on the phone. It speaks simple Spanish at your level, uses the words you've studied, and
  corrects your mistakes with a one-line explanation.

## Install on your Android phone

1. Make sure GitHub Pages is enabled for this repo: **Settings → Pages → Build and deployment →
   Source: GitHub Actions**. Every push to `main` tests, builds and deploys the app.
2. On the phone, open **Chrome** and go to `https://<your-github-username>.github.io/Spanish_App/`.
3. Tap the **⋮** menu → **Add to Home screen** → **Install**. (Chrome may also show an "Install app"
   banner.)
4. Open it from the home screen. It runs full-screen and works offline after the first load.
5. The first time you get a speaking exercise, allow microphone access.
   Tip: in Android **Settings → System → Languages → Text-to-speech**, install the Spanish voice
   data for the Google speech engine if the voice sounds wrong.

**Back up now and then** (Settings → Export backup, then save to Drive). Uninstalling the app or
clearing Chrome's site data deletes your progress.

## AI conversation setup (optional)

A Claude Pro subscription or GitHub Copilot can't be used by an app; you need a pay-as-you-go
Anthropic API key. Costs are per use (see below), there is no monthly fee.

### 1. Get an Anthropic API key

1. Go to <https://console.anthropic.com>, sign up, and add a payment method under **Billing**
   (buy e.g. $5 of credit).
2. Under **Billing → Limits**, set a **monthly spend limit** (e.g. $5) so a bug can't cost you money.
3. Under **API keys**, create a key. Copy it (starts with `sk-ant-`).

### 2. Deploy the Worker (free Cloudflare account)

You need Node.js on your laptop once, for the deploy.

```bash
cd worker
npm install
npx wrangler login                        # opens the browser to sign in / sign up to Cloudflare (free)
npx wrangler secret put ANTHROPIC_API_KEY # paste the sk-ant-... key
npx wrangler secret put APP_TOKEN         # paste a long random password you make up
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL, like `https://spanish-tutor.<you>.workers.dev`.
Check it works: open `<that URL>/health` in a browser. It should show `{"ok":true,...}`.

If you host the app somewhere other than `https://borisstermeneer.github.io`, change
`ALLOWED_ORIGIN` in `worker/wrangler.toml` and deploy again.

### 3. Connect the app

In the app: **Settings → AI conversation**, paste the Worker URL and the same `APP_TOKEN`.
Then go to **Talk**, pick a topic, and type or tap 🎤 to speak.

### Model and cost

The model is set by `MODEL` in `worker/wrangler.toml`. A 10-minute chat is roughly 25 turns,
about 60k input and 9k output tokens:

| Model | Price (input / output per 1M tokens) | Per 10-min chat | Chatting 10 min every day |
|---|---|---|---|
| `claude-opus-5-5` | $4 / $20 | ~$0.40 | ~$12 / month |
| `claude-haiku-5-5` | $0.10 / $0.50 | ~$0.01 | ~$0.30 / month |

These are estimates; check real usage in the Anthropic console. The tutor runs at low effort
with short replies to keep it cheap. To switch model, edit `MODEL` and run `npx wrangler deploy`.

## Development

```bash
npm install
npm run dev        # http://localhost:5173/Spanish_App/
npm test           # unit tests (answer checking, scheduler, curriculum checks, storage)
npm run build
cd worker && npm install && npm test
```

Speech recognition only works in Chrome (desktop or Android); text-to-speech works in all modern
browsers.

### Project layout

```
src/content/curriculum.ts   all course content (units, grammar cards, items, drills)
src/lib/session.ts          what to show next in a session (FSRS-driven)
src/lib/srs.ts              FSRS wrapper
src/lib/answer.ts           answer checking (accents, typos, speech)
src/lib/db.ts               IndexedDB storage, backup
src/lib/speech.ts           text-to-speech and speech recognition
src/screens/                Home, Session, Grammar, Talk, Settings
worker/                     Cloudflare Worker proxy for the AI tutor
```

### Adding content

Add a unit to `src/content/curriculum.ts`. Item ids come from the unit id + Spanish text, so you
can fix English translations and notes without losing progress, but changing the Spanish text
makes it a new item. `npm test` checks for duplicate ids, malformed drills, and drill
distractors that the answer checker would wrongly accept.

## Content roadmap

Units 1–12 cover the core of A1. Planned next, in this order:

**Rest of A1**
- 13. Food, shopping and prices (numbers 20–100, ¿cuánto cuesta?, quiero / me pone)
- 14. Describing people and things (colours, adjective position, muy / mucho)
- 15. Directions and places in town (a la derecha, cerca de, estar + location review)
- 16. Weather and seasons (hace calor, llueve), months and dates

**A2**
- Pretérito perfecto (he comido): what you did today / ever
- Pretérito indefinido (comí, fui): finished past events; regular forms, then ser/ir, tener, hacer
- Imperfecto (comía): how things used to be; contrast with indefinido
- Direct and indirect object pronouns (lo, la, le, se lo)
- Comparatives and superlatives (más… que, el más…)
- Estar + gerundio (estoy comiendo)
- Imperative for instructions (habla, no hables) and polite requests
- Future with ir a vs. simple future (comeré), basic conditional (me gustaría)

Each unit is hand-written and checked by the automated tests before it ships. An optional later
addition: let the AI tutor generate extra drill sentences that use only words you have already
studied, shown after the answer checker has validated them.
