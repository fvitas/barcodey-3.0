import { describe, expect, it } from 'vitest'
import { newIssueUrl, suggestBrandUrl } from './feedback'

describe('newIssueUrl', () => {
  it('links straight to the given issue form', () => {
    expect(newIssueUrl('bug-report.yml')).toBe('https://github.com/fvitas/barcodey-3.0/issues/new?template=bug-report.yml')
  })
})

describe('suggestBrandUrl', () => {
  it('prefills every filled field into the brand form', () => {
    const url = new URL(suggestBrandUrl({ name: '  Maxi ', country: 'Serbia', color: '#0050aa' }))
    expect(url.origin + url.pathname).toBe('https://github.com/fvitas/barcodey-3.0/issues/new')
    expect(url.searchParams.get('template')).toBe('suggest-brand.yml')
    expect(url.searchParams.get('title')).toBe('Brand suggestion: Maxi')
    expect(url.searchParams.get('name')).toBe('Maxi')
    expect(url.searchParams.get('country')).toBe('Serbia')
    expect(url.searchParams.get('color')).toBe('#0050aa')
  })

  it('omits blank fields and opens the bare form', () => {
    const params = new URL(suggestBrandUrl({ name: '', country: ' ', color: '' })).searchParams
    expect(params.get('template')).toBe('suggest-brand.yml')
    expect(params.get('title')).toBeNull()
    expect(params.get('name')).toBeNull()
    expect(params.get('country')).toBeNull()
    expect(params.get('color')).toBeNull()
  })
})
