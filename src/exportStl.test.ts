import { describe, expect, it } from 'vitest'
import { exportPropertyStl } from './exportStl'
import { magnoliaCottage } from './listings'

describe('printable export', () => {
  it('writes a binary STL with triangles for the cottage shell', () => {
    const buffer = exportPropertyStl(magnoliaCottage(), {
      scale: 200,
      minWallMm: 1.6,
      includeRoof: true,
      includeFurniture: false,
      separateStories: false,
    })
    const view = new DataView(buffer)
    const triangles = view.getUint32(80, true)
    expect(buffer.byteLength).toBe(84 + triangles * 50)
    expect(triangles).toBeGreaterThan(100)
  })
})
