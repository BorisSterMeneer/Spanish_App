import { describe, expect, it } from 'vitest'
import { checkAnswer, checkSpoken } from '../lib/answer'

describe('checkAnswer', () => {
  it('ignores case, punctuation and inverted marks', () => {
    expect(checkAnswer('como estas', ['¿Cómo estás?']).verdict).toBe('accent')
    expect(checkAnswer('¿cómo estás?', ['¿Cómo estás?']).verdict).toBe('correct')
    expect(checkAnswer('  Hola!! ', ['hola']).verdict).toBe('correct')
  })
  it('flags missing accents and ñ', () => {
    expect(checkAnswer('el nino', ['el niño']).verdict).toBe('accent')
    expect(checkAnswer('adios', ['adiós']).verdict).toBe('accent')
  })
  it('accepts a dropped subject pronoun but not an invented one', () => {
    expect(checkAnswer('Es médica', ['Ella es médica.']).verdict).toBe('correct')
    expect(checkAnswer('Yo soy estudiante', ['Soy estudiante.']).verdict).not.toBe('correct')
  })
  it('accepts alternatives', () => {
    expect(checkAnswer('encantada', ['Mucho gusto.', 'encantado', 'encantada']).verdict).toBe('correct')
  })
  it('treats one slip in a longer answer as a typo', () => {
    expect(checkAnswer('trabajamso', ['trabajamos']).verdict).toBe('wrong') // transposition = 2 edits
    expect(checkAnswer('trbajamos', ['trabajamos']).verdict).toBe('typo')
    expect(checkAnswer('Nesesito un café', ['Necesito un café.']).verdict).toBe('typo')
    expect(checkAnswer('vivemos', ['vivimos']).verdict).toBe('wrong')
    expect(checkAnswer('sou', ['soy']).verdict).toBe('wrong') // too short for typo tolerance
  })
  it('rejects wrong conjugations', () => {
    expect(checkAnswer('es', ['soy']).verdict).toBe('wrong')
    expect(checkAnswer('hablas', ['habla']).verdict).toBe('wrong')
    expect(checkAnswer('llama', ['llamo']).verdict).toBe('wrong')
    expect(checkAnswer('Ella es medico', ['Ella es médica.']).verdict).toBe('wrong')
    expect(checkAnswer('el casa', ['la casa']).verdict).toBe('wrong')
    expect(checkAnswer('Trabajan en una oficina', ['Trabajamos en una oficina.']).verdict).toBe('wrong')
  })
  it('rejects empty input', () => {
    expect(checkAnswer('   ', ['hola']).verdict).toBe('wrong')
  })
})

describe('checkSpoken', () => {
  it('accepts a close transcript among alternatives', () => {
    const r = checkSpoken(['tengo hambre', 'tengo hombre'], ['Tengo hambre.'])
    expect(r.verdict).toBe('correct')
  })
  it('tolerates a small mishearing', () => {
    expect(checkSpoken(['vivo en una ciudad pequena'], ['Vivo en una ciudad pequeña.']).verdict).toBe('correct')
    expect(checkSpoken(['vivo en un ciudad pequeña'], ['Vivo en una ciudad pequeña.']).verdict).toBe('typo')
  })
  it('rejects something else', () => {
    expect(checkSpoken(['buenos días'], ['Buenas noches.']).verdict).toBe('wrong')
  })
})
