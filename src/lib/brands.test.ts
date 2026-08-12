import { describe, expect, it } from 'vitest'
import { brandCategoryLabel, groupBrandsByLetter, searchBrands, type Brand } from './brands'

function brand(overrides: Partial<Brand> & { id: string; name: string }): Brand {
  return { countries: ['001'], cat: 'supermarket', color: '#0050aa', ...overrides }
}

const catalog: Brand[] = [
  brand({ id: 'lidl', name: 'Lidl', aliases: ['lidl deutschland', 'lidl polska'] }),
  brand({ id: 'lidl-bg', name: 'Lidl (bg)', countries: ['bg'] }),
  brand({ id: 'dm', name: 'dm', cat: 'chemist', countries: ['de', 'rs', 'hr'] }),
  brand({ id: 'maxi', name: 'Maxi', countries: ['rs'] }),
  brand({ id: 'delhaize', name: 'AD Delhaize', countries: ['be'] }),
  brand({ id: '99-speedmart', name: '99 Speedmart', countries: ['my'] }),
  brand({ id: 'fast-eddys', name: 'Fast Food Freddy', cat: 'fast_food', aliases: ['freddyland'] }),
]

describe('searchBrands', () => {
  it('returns empty for a blank query', () => {
    expect(searchBrands(catalog, '  ', 'rs')).toEqual([])
  })

  it('ranks name prefix above alias prefix above substring', () => {
    const names = searchBrands(catalog, 'lidl', 'rs').map(entry => entry.id)
    expect(names[0]).toBe('lidl')
    expect(names).toContain('lidl-bg')
  })

  it('matches aliases case-insensitively', () => {
    expect(searchBrands(catalog, 'FREDDYLAND', undefined).map(entry => entry.id)).toEqual(['fast-eddys'])
  })

  it('boosts brands available in the user country', () => {
    // dm (rs) and AD Delhaize (be) both substring-match 'd'; the local one wins its rank tie
    const ids = searchBrands(catalog, 'd', 'rs').map(entry => entry.id)
    expect(ids.indexOf('dm')).toBeLessThan(ids.indexOf('delhaize'))
  })

  it('finds substring matches anywhere in the name', () => {
    expect(searchBrands(catalog, 'speedmart', undefined).map(entry => entry.id)).toEqual(['99-speedmart'])
  })
})

describe('groupBrandsByLetter', () => {
  it('groups alphabetically with sorted brands inside each group', () => {
    const groups = groupBrandsByLetter(catalog)
    const letters = groups.map(group => group.letter)
    expect(letters).toEqual([...letters].sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b))))
    const l = groups.find(group => group.letter === 'L')
    expect(l?.brands.map(entry => entry.name)).toEqual(['Lidl', 'Lidl (bg)'])
  })

  it('pools digit-initial names under #', () => {
    const hash = groupBrandsByLetter(catalog).find(group => group.letter === '#')
    expect(hash?.brands.map(entry => entry.id)).toEqual(['99-speedmart'])
    // and # sorts last
    expect(groupBrandsByLetter(catalog).at(-1)?.letter).toBe('#')
  })

  it('uppercases lowercase brand initials into their letter group', () => {
    const d = groupBrandsByLetter(catalog).find(group => group.letter === 'D')
    expect(d?.brands.map(entry => entry.id)).toContain('dm')
  })
})

describe('brandCategoryLabel', () => {
  it('prettifies category slugs', () => {
    expect(brandCategoryLabel(brand({ id: 'x', name: 'X', cat: 'fast_food' }))).toBe('Fast food')
    expect(brandCategoryLabel(brand({ id: 'y', name: 'Y' }))).toBe('Supermarket')
  })
})
