import { describe, it, expect } from 'vitest'
import { toTitleCase, buildSuggestions } from '../brandSuggestions'

describe('toTitleCase', () => {
  it('capitalizes the first letter of each word', () => {
    expect(toTitleCase('kodak portra')).toBe('Kodak Portra')
  })

  it('lowercases the remaining letters in each word', () => {
    expect(toTitleCase('KODAK PORTRA')).toBe('Kodak Portra')
  })

  it('handles a single word', () => {
    expect(toTitleCase('portra')).toBe('Portra')
  })

  it('handles an already-title-cased string without changing it', () => {
    expect(toTitleCase('Portra 400')).toBe('Portra 400')
  })

  it('handles an empty string', () => {
    expect(toTitleCase('')).toBe('')
  })
})

describe('buildSuggestions', () => {
  it('returns an empty array when the query is empty', () => {
    expect(buildSuggestions('', [])).toEqual([])
  })

  it('returns an empty array when the query is only whitespace', () => {
    expect(buildSuggestions('   ', [])).toEqual([])
  })

  it('places the title-cased query first', () => {
    const result = buildSuggestions('kodak', [])
    expect(result[0]).toBe('Kodak')
  })

  it('places the exact query second when it differs from title case', () => {
    const result = buildSuggestions('kodak', [])
    expect(result[1]).toBe('kodak')
  })

  it('does not duplicate the query when it already matches title case', () => {
    const result = buildSuggestions('Kodak', [])
    expect(result.filter(s => s === 'Kodak')).toHaveLength(1)
  })

  it('appends DB brands after the typed values', () => {
    const result = buildSuggestions('por', ['Portra 400', 'Portra 800'])
    const titleIdx = result.indexOf('Por')
    expect(result).toContain('Portra 400')
    expect(result).toContain('Portra 800')
    expect(titleIdx).toBeLessThan(result.indexOf('Portra 400'))
  })

  it('does not duplicate a DB brand that matches the title-cased query', () => {
    const result = buildSuggestions('portra 400', ['Portra 400'])
    expect(result.filter(s => s === 'Portra 400')).toHaveLength(1)
  })

  it('does not duplicate a DB brand that matches the exact query', () => {
    const result = buildSuggestions('Portra 400', ['Portra 400'])
    expect(result.filter(s => s === 'Portra 400')).toHaveLength(1)
  })

  it('includes all non-duplicate DB brands', () => {
    const dbBrands = ['Portra 400', 'Portra 800', 'Ektar 100']
    const result = buildSuggestions('por', dbBrands)
    expect(result).toContain('Portra 400')
    expect(result).toContain('Portra 800')
    expect(result).toContain('Ektar 100')
  })
})
