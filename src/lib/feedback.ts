export const repoUrl = 'https://github.com/fvitas/barcodey-3.0'

export type IssueTemplate = 'suggest-brand.yml' | 'bug-report.yml' | 'feature-request.yml'

export function newIssueUrl(template: IssueTemplate): string {
  return `${repoUrl}/issues/new?template=${template}`
}

export type BrandSuggestion = { name: string; country: string; color: string }

export function suggestBrandUrl(suggestion: BrandSuggestion): string {
  const params = new URLSearchParams({ template: 'suggest-brand.yml' })
  const name = suggestion.name.trim()
  if (name !== '') {
    params.set('title', `Brand suggestion: ${name}`)
    params.set('name', name)
  }
  const country = suggestion.country.trim()
  if (country !== '') params.set('country', country)
  const color = suggestion.color.trim()
  if (color !== '') params.set('color', color)
  return `${repoUrl}/issues/new?${params}`
}
