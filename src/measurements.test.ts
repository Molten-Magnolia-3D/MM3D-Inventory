import { describe, expect, it } from 'vitest'
import { magnoliaCottage, copperHillColonial } from './listings'
import {
  feetToPrintMm,
  finishedArea,
  formatArea,
  formatFeet,
  roomArea,
  snap,
  storyArea,
  storyElevation,
} from './measurements'

describe('measurements', () => {
  it('computes room area from the floor plate', () => {
    expect(roomArea({ id: 'r', storyId: 's', name: 'x', x: 0, z: 0, width: 12, depth: 10, wallColor: '#fff', floorColor: '#fff' })).toBe(120)
  })

  it('snaps drawing to a half-foot grid', () => {
    expect(snap(10.24)).toBe(10)
    expect(snap(10.3)).toBe(10.5)
  })

  it('stacks story elevations from slabs and ceiling heights', () => {
    const home = copperHillColonial()
    expect(storyElevation(home, home.stories[0].id)).toBe(0)
    const second = storyElevation(home, home.stories[1].id)
    expect(second).toBe(home.stories[0].slab + home.stories[0].height)
  })

  it('keeps sample homes in a realtor-sized area range', () => {
    const cottage = magnoliaCottage()
    const area = finishedArea(cottage)
    expect(area).toBeGreaterThan(800)
    expect(area).toBeLessThan(2500)
    expect(storyArea(cottage, cottage.stories[0].id)).toBe(area)
    expect(formatArea(area)).toMatch(/sf$/)
    expect(formatFeet(9)).toBe('9′')
  })

  it('converts feet to print millimeters at a model scale', () => {
    expect(feetToPrintMm(1, 100)).toBeCloseTo(3.048)
    expect(feetToPrintMm(40, 200)).toBeCloseTo(60.96)
  })
})
