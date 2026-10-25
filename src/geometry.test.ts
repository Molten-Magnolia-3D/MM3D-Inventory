import { describe, expect, it } from 'vitest'
import { isInteriorEdge, nearestEdge, normalizeRoom, roomAtPoint } from './geometry'
import { magnoliaCottage } from './listings'

describe('geometry', () => {
  it('normalizes a dragged room to a minimum livable plate', () => {
    expect(normalizeRoom(20, 20, 10, 12)).toEqual({ x: 10, z: 12, width: 10, depth: 8 })
    expect(normalizeRoom(0, 0, 1, 1)).toEqual({ x: 0, z: 0, width: 4, depth: 4 })
  })

  it('finds the nearest wall for doors and windows', () => {
    const room = { id: 'r', storyId: 's', name: 'x', x: 0, z: 0, width: 12, depth: 10, wallColor: '#fff', floorColor: '#fff' }
    expect(nearestEdge(room, 6, 0.1).side).toBe('s')
    expect(nearestEdge(room, 11.9, 5).side).toBe('e')
  })

  it('treats shared cottage walls as interior partitions', () => {
    const home = magnoliaCottage()
    const living = home.rooms.find((room) => room.name === 'Living')
    const dining = home.rooms.find((room) => room.name === 'Dining')
    expect(living && dining).toBeTruthy()
    if (!living || !dining) return
    expect(isInteriorEdge(home, living, 'e')).toBe(true)
    expect(isInteriorEdge(home, dining, 'w')).toBe(true)
    expect(roomAtPoint(home, living.storyId, living.x + 1, living.z + 1)?.id).toBe(living.id)
  })
})
