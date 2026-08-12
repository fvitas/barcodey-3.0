export const repoUrl = 'https://github.com/fvitas/barcodey-3.0'

export type IssueTemplate = 'suggest-brand.yml' | 'bug-report.yml' | 'feature-request.yml'

export function newIssueUrl(template: IssueTemplate): string {
  return `${repoUrl}/issues/new?template=${template}`
}

export function suggestBrandUrl(query: string): string {
  const name = query.trim()
  const params = new URLSearchParams({ template: 'suggest-brand.yml' })
  if (name !== '') {
    params.set('title', `Brand suggestion: ${name}`)
    params.set('name', name)
  }
  return `${repoUrl}/issues/new?${params}`
}
