import { describe, expect, it } from 'vitest'
import { newIssueUrl, suggestBrandUrl } from './feedback'

describe('newIssueUrl', () => {
  it('links straight to the given issue form', () => {
    expect(newIssueUrl('bug-report.yml')).toBe('https://github.com/fvitas/barcodey-3.0/issues/new?template=bug-report.yml')
  })
})

describe('suggestBrandUrl', () => {
  it('prefills the searched name into the brand form', () => {
    const url = new URL(suggestBrandUrl('  Maxi '))
    expect(url.origin + url.pathname).toBe('https://github.com/fvitas/barcodey-3.0/issues/new')
    expect(url.searchParams.get('template')).toBe('suggest-brand.yml')
    expect(url.searchParams.get('title')).toBe('Brand suggestion: Maxi')
    expect(url.searchParams.get('name')).toBe('Maxi')
  })

  it('opens the blank form when the query is empty', () => {
    const params = new URL(suggestBrandUrl('')).searchParams
    expect(params.get('template')).toBe('suggest-brand.yml')
    expect(params.get('title')).toBeNull()
    expect(params.get('name')).toBeNull()
  })
})
