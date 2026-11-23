export type ItemKind = 'word' | 'phrase' | 'sentence' | 'cloze'

/** One learnable thing. Words/phrases/sentences get two SRS cards
 *  (recognise: es→en, produce: en→es). Cloze drills get one card. */
export interface Item {
  id: string
  kind: ItemKind
  /** Spanish. For cloze: the full correct sentence (used for audio). */
  es: string
  /** English meaning. For cloze: translation of the full sentence. */
  en: string
  /** Other accepted Spanish answers (produce / dictation / speaking). */
  alts?: string[]
  /** Short learner note shown on the intro card and after mistakes. */
  note?: string
  /** Cloze only: sentence with "___" in place of the answer, e.g. "Yo ___ estudiante." */
  cloze?: string
  /** Cloze only: hint shown after the sentence, e.g. "ser". */
  hint?: string
  /** Cloze only: the word(s) that fill the gap. */
  answer?: string
  /** Cloze only: wrong options for multiple choice. */
  choices?: string[]
}

export interface GrammarCard {
  title: string
  /** Short paragraphs. Lines starting with "| " are rendered as a table row (cells split on " | "). */
  body: string[]
  examples: { es: string; en: string }[]
}

export interface Unit {
  id: string
  title: string
  cefr: 'A1'
  grammar: GrammarCard
  items: Item[]
}

export type CardMode = 'recog' | 'prod' | 'cloze'

export interface StoredCard {
  /** `${itemId}:${mode}` */
  id: string
  itemId: string
  mode: CardMode
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review: number | null
}

export interface ReviewLogEntry {
  id?: number
  cardId: string
  ts: number
  rating: number
  exercise: ExerciseType
  correct: boolean
}

export type ExerciseType =
  | 'mc-meaning' // see Spanish, pick English
  | 'mc-spanish' // see English, pick Spanish
  | 'listen-meaning' // hear Spanish, pick English
  | 'type-spanish' // see English, type Spanish
  | 'dictation' // hear Spanish, type Spanish
  | 'speak' // see English, say Spanish
  | 'cloze-mc'
  | 'cloze-type'

export interface Settings {
  sessionMinutes: number
  newPerSession: number
  voiceLang: 'es-ES' | 'es-MX'
  voiceName: string | null
  speechRate: number
  enableSpeaking: boolean
  enableListening: boolean
  aiWorkerUrl: string
  aiToken: string
}

export const DEFAULT_SETTINGS: Settings = {
  sessionMinutes: 10,
  newPerSession: 12,
  voiceLang: 'es-ES',
  voiceName: null,
  speechRate: 0.9,
  enableSpeaking: true,
  enableListening: true,
  aiWorkerUrl: '',
  aiToken: '',
}
