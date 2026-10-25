import { describe, expect, it } from 'vitest'
import { CATALOG, CATALOG_BY_ID, CATEGORIES, ROOF_STYLES, searchCatalog } from './catalog'
import { seedListings } from './listings'

describe('catalog and inventory', () => {
  it('ships a full household library plus every roof family', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(50)
    expect(ROOF_STYLES.map((roof) => roof.id)).toEqual(['gable', 'hip', 'shed', 'flat', 'gambrel', 'mansard'])
    expect(CATEGORIES.length).toBe(12)
    expect(searchCatalog('sofa').length).toBeGreaterThan(0)
    expect(CATALOG_BY_ID['bed-primary']?.kind).toBe('bed')
  })

  it('seeds one-story, two-story, and three-story listings', () => {
    const homes = seedListings()
    expect(homes.map((home) => home.stories.length)).toEqual([1, 2, 3])
    for (const home of homes) {
      expect(home.rooms.length).toBeGreaterThan(3)
      expect(home.assets.every((asset) => CATALOG_BY_ID[asset.catalogId])).toBe(true)
    }
  })
})
