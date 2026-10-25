import type { Opening, Property, Room, Side, Story } from './types'

export function roomArea(room: Room): number {
  return room.width * room.depth
}

export function roomsOnStory(property: Property, storyId: string): Room[] {
  return property.rooms.filter((room) => room.storyId === storyId)
}

export function storyArea(property: Property, storyId: string): number {
  return roomsOnStory(property, storyId).reduce((sum, room) => sum + roomArea(room), 0)
}

export function finishedArea(property: Property): number {
  return property.stories.reduce((sum, story) => sum + storyArea(property, story.id), 0)
}

export function storyIndex(property: Property, storyId: string): number {
  return property.stories.findIndex((story) => story.id === storyId)
}

export function storyElevation(property: Property, storyId: string): number {
  const index = storyIndex(property, storyId)
  if (index < 0) return 0
  let y = 0
  for (let i = 0; i < index; i += 1) {
    const story = property.stories[i]
    y += story.slab + story.height
  }
  return y
}

export function storyTop(property: Property, story: Story): number {
  return storyElevation(property, story.id) + story.slab + story.height
}

export function buildingHeight(property: Property): number {
  const last = property.stories[property.stories.length - 1]
  if (!last) return 0
  const roofRise = roofRiseHeight(property)
  return storyTop(property, last) + roofRise
}

export function footprint(property: Property, storyId?: string): {
  minX: number
  minZ: number
  maxX: number
  maxZ: number
} {
  const rooms = storyId ? roomsOnStory(property, storyId) : property.rooms
  if (rooms.length === 0) {
    return { minX: 0, minZ: 0, maxX: property.lotWidth, maxZ: property.lotDepth }
  }
  return rooms.reduce(
    (box, room) => ({
      minX: Math.min(box.minX, room.x),
      minZ: Math.min(box.minZ, room.z),
      maxX: Math.max(box.maxX, room.x + room.width),
      maxZ: Math.max(box.maxZ, room.z + room.depth),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    },
  )
}

export function roofRiseHeight(property: Property): number {
  const last = property.stories[property.stories.length - 1]
  if (!last) return 0
  const box = footprint(property, last.id)
  const span = Math.min(box.maxX - box.minX, box.maxZ - box.minZ)
  const rise = (span / 2) * property.roof.pitch
  if (property.roof.style === 'flat') return 1.2
  if (property.roof.style === 'shed') return span * property.roof.pitch
  if (property.roof.style === 'mansard') return Math.max(6, rise * 0.7)
  return Math.max(4, rise)
}

export function formatFeet(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}′` : `${rounded.toFixed(1)}′`
}

export function formatArea(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} sf`
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function edgeLength(room: Room, side: Side): number {
  return side === 'n' || side === 's' ? room.width : room.depth
}

export function openingFits(room: Room, opening: Opening): boolean {
  return opening.offset >= 0 && opening.offset + opening.width <= edgeLength(room, opening.side)
}

export function snap(value: number, increment = 0.5): number {
  return Math.round(value / increment) * increment
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function printScaleLabel(scale: number): string {
  return `1:${scale}`
}

export function feetToPrintMm(feet: number, scale: number): number {
  return (feet * 304.8) / scale
}
