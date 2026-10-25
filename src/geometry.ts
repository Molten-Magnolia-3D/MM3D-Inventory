import type { Opening, Property, Room, Side } from './types'
import { edgeLength, roomsOnStory } from './measurements'

export const EXTERIOR_WALL = 0.5
export const INTERIOR_WALL = 0.35

export interface WallSegment {
  id: string
  storyId: string
  roomId: string
  side: Side
  x1: number
  z1: number
  x2: number
  z2: number
  interior: boolean
  openings: Opening[]
}

export function roomCenter(room: Room): { x: number; z: number } {
  return { x: room.x + room.width / 2, z: room.z + room.depth / 2 }
}

export function edgeEndpoints(room: Room, side: Side): {
  x1: number
  z1: number
  x2: number
  z2: number
} {
  if (side === 's') return { x1: room.x, z1: room.z, x2: room.x + room.width, z2: room.z }
  if (side === 'n') {
    return { x1: room.x, z1: room.z + room.depth, x2: room.x + room.width, z2: room.z + room.depth }
  }
  if (side === 'w') return { x1: room.x, z1: room.z, x2: room.x, z2: room.z + room.depth }
  return { x1: room.x + room.width, z1: room.z, x2: room.x + room.width, z2: room.z + room.depth }
}

function sameLine(
  a: { x1: number; z1: number; x2: number; z2: number },
  b: { x1: number; z1: number; x2: number; z2: number },
  tolerance = 0.2,
): boolean {
  const aHoriz = Math.abs(a.z1 - a.z2) < tolerance
  const bHoriz = Math.abs(b.z1 - b.z2) < tolerance
  if (aHoriz && bHoriz) {
    if (Math.abs(a.z1 - b.z1) > tolerance) return false
    const aMin = Math.min(a.x1, a.x2)
    const aMax = Math.max(a.x1, a.x2)
    const bMin = Math.min(b.x1, b.x2)
    const bMax = Math.max(b.x1, b.x2)
    return aMax > bMin + 0.4 && bMax > aMin + 0.4
  }
  const aVert = Math.abs(a.x1 - a.x2) < tolerance
  const bVert = Math.abs(b.x1 - b.x2) < tolerance
  if (aVert && bVert) {
    if (Math.abs(a.x1 - b.x1) > tolerance) return false
    const aMin = Math.min(a.z1, a.z2)
    const aMax = Math.max(a.z1, a.z2)
    const bMin = Math.min(b.z1, b.z2)
    const bMax = Math.max(b.z1, b.z2)
    return aMax > bMin + 0.4 && bMax > aMin + 0.4
  }
  return false
}

export function isInteriorEdge(property: Property, room: Room, side: Side): boolean {
  const self = edgeEndpoints(room, side)
  return roomsOnStory(property, room.storyId).some((other) => {
    if (other.id === room.id) return false
    return (['n', 's', 'e', 'w'] as Side[]).some((otherSide) =>
      sameLine(self, edgeEndpoints(other, otherSide)),
    )
  })
}

export function wallsForStory(property: Property, storyId: string): WallSegment[] {
  const rooms = roomsOnStory(property, storyId)
  const walls: WallSegment[] = []
  for (const room of rooms) {
    for (const side of ['n', 's', 'e', 'w'] as Side[]) {
      const ends = edgeEndpoints(room, side)
      const openings = property.openings.filter(
        (opening) => opening.roomId === room.id && opening.side === side,
      )
      walls.push({
        id: `${room.id}-${side}`,
        storyId,
        roomId: room.id,
        side,
        ...ends,
        interior: isInteriorEdge(property, room, side),
        openings,
      })
    }
  }
  return walls
}

export function openingWorld(room: Room, opening: Opening): {
  x: number
  z: number
  rotation: number
} {
  const len = edgeLength(room, opening.side)
  const t = (opening.offset + opening.width / 2) / Math.max(len, 0.01)
  if (opening.side === 's') return { x: room.x + t * room.width, z: room.z, rotation: 0 }
  if (opening.side === 'n') {
    return { x: room.x + t * room.width, z: room.z + room.depth, rotation: 180 }
  }
  if (opening.side === 'w') return { x: room.x, z: room.z + t * room.depth, rotation: 90 }
  return { x: room.x + room.width, z: room.z + t * room.depth, rotation: -90 }
}

export function nearestEdge(
  room: Room,
  x: number,
  z: number,
): { side: Side; offset: number; distance: number } {
  const candidates: { side: Side; offset: number; distance: number }[] = [
    { side: 's', offset: x - room.x, distance: Math.abs(z - room.z) },
    { side: 'n', offset: x - room.x, distance: Math.abs(z - (room.z + room.depth)) },
    { side: 'w', offset: z - room.z, distance: Math.abs(x - room.x) },
    { side: 'e', offset: z - room.z, distance: Math.abs(x - (room.x + room.width)) },
  ]
  return candidates.reduce((best, current) => (current.distance < best.distance ? current : best))
}

export function roomAtPoint(property: Property, storyId: string, x: number, z: number): Room | undefined {
  return roomsOnStory(property, storyId).find(
    (room) => x >= room.x && x <= room.x + room.width && z >= room.z && z <= room.z + room.depth,
  )
}

export function assetAtPoint(
  property: Property,
  storyId: string,
  x: number,
  z: number,
  sizes: (catalogId: string) => { width: number; depth: number },
): string | undefined {
  const hits = property.assets.filter((asset) => {
    if (asset.storyId !== storyId) return false
    const size = sizes(asset.catalogId)
    const halfW = (size.width * asset.scale) / 2
    const halfD = (size.depth * asset.scale) / 2
    return x >= asset.x - halfW && x <= asset.x + halfW && z >= asset.z - halfD && z <= asset.z + halfD
  })
  return hits[hits.length - 1]?.id
}

export function normalizeRoom(x1: number, z1: number, x2: number, z2: number): {
  x: number
  z: number
  width: number
  depth: number
} {
  const x = Math.min(x1, x2)
  const z = Math.min(z1, z2)
  return {
    x,
    z,
    width: Math.max(Math.abs(x2 - x1), 4),
    depth: Math.max(Math.abs(z2 - z1), 4),
  }
}
