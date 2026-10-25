import { CATALOG_BY_ID } from './catalog'
import { EXTERIOR_WALL, INTERIOR_WALL, wallsForStory } from './geometry'
import {
  footprint,
  roomsOnStory,
  storyElevation,
  storyTop,
} from './measurements'
import type { PrintProfile, Property, RoofStyle } from './types'

export interface MeshPart {
  id: string
  role: 'lot' | 'slab' | 'wall' | 'header' | 'sill' | 'glass' | 'roof' | 'furniture'
  shape: 'box' | 'cylinder' | 'cone'
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  rotationY: number
  color: string
  catalogId?: string
  extra?: Record<string, number>
}

function box(
  id: string,
  role: MeshPart['role'],
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  rotationY = 0,
): MeshPart {
  return { id, role, shape: 'box', x, y, z, w, h, d, rotationY, color }
}

function wallPieces(
  property: Property,
  storyId: string,
  wallHeight: number,
  floorY: number,
  wallScale: number,
): MeshPart[] {
  const parts: MeshPart[] = []
  const walls = wallsForStory(property, storyId)
  const drawn = new Set<string>()

  for (const wall of walls) {
    const key = [
      Math.round(Math.min(wall.x1, wall.x2) * 10),
      Math.round(Math.min(wall.z1, wall.z2) * 10),
      Math.round(Math.max(wall.x1, wall.x2) * 10),
      Math.round(Math.max(wall.z1, wall.z2) * 10),
      storyId,
    ].join(':')
    if (wall.interior && drawn.has(key)) continue
    drawn.add(key)

    const thickness = (wall.interior ? INTERIOR_WALL : EXTERIOR_WALL) * wallScale
    const horizontal = Math.abs(wall.z1 - wall.z2) < 0.05
    const length = horizontal
      ? Math.abs(wall.x2 - wall.x1)
      : Math.abs(wall.z2 - wall.z1)
    const midX = (wall.x1 + wall.x2) / 2
    const midZ = (wall.z1 + wall.z2) / 2
    const color = wall.interior ? '#efe8df' : '#f4efe6'
    const openings = [...wall.openings].sort((a, b) => a.offset - b.offset)
    let cursor = 0
    const addSpan = (start: number, end: number, height: number, y: number, suffix: string) => {
      const span = end - start
      if (span < 0.15) return
      const center = start + span / 2
      const x = horizontal ? Math.min(wall.x1, wall.x2) + center : midX
      const z = horizontal ? midZ : Math.min(wall.z1, wall.z2) + center
      parts.push(
        box(
          `${wall.id}-${suffix}`,
          'wall',
          x,
          y,
          z,
          horizontal ? span : thickness,
          height,
          horizontal ? thickness : span,
          color,
        ),
      )
    }

    for (const opening of openings) {
      addSpan(cursor, opening.offset, wallHeight, floorY + wallHeight / 2, `solid-${cursor}`)
      const header = Math.max(wallHeight - opening.sill - opening.height, 0.2)
      if (opening.sill > 0.1) {
        parts.push(
          box(
            `${opening.id}-sill`,
            'sill',
            horizontal ? Math.min(wall.x1, wall.x2) + opening.offset + opening.width / 2 : midX,
            floorY + opening.sill / 2,
            horizontal ? midZ : Math.min(wall.z1, wall.z2) + opening.offset + opening.width / 2,
            horizontal ? opening.width : thickness,
            opening.sill,
            horizontal ? thickness : opening.width,
            '#d8c3a5',
          ),
        )
      }
      parts.push(
        box(
          `${opening.id}-head`,
          'header',
          horizontal ? Math.min(wall.x1, wall.x2) + opening.offset + opening.width / 2 : midX,
          floorY + opening.sill + opening.height + header / 2,
          horizontal ? midZ : Math.min(wall.z1, wall.z2) + opening.offset + opening.width / 2,
          horizontal ? opening.width : thickness,
          header,
          horizontal ? thickness : opening.width,
          color,
        ),
      )
      if (opening.type === 'window') {
        parts.push(
          box(
            `${opening.id}-glass`,
            'glass',
            horizontal ? Math.min(wall.x1, wall.x2) + opening.offset + opening.width / 2 : midX,
            floorY + opening.sill + opening.height / 2,
            horizontal ? midZ : Math.min(wall.z1, wall.z2) + opening.offset + opening.width / 2,
            horizontal ? opening.width * 0.92 : 0.08,
            opening.height * 0.88,
            horizontal ? 0.08 : opening.width * 0.92,
            '#9ec5d8',
          ),
        )
      }
      cursor = opening.offset + opening.width
    }
    addSpan(cursor, length, wallHeight, floorY + wallHeight / 2, `solid-end`)
  }
  return parts
}

function roofParts(property: Property, wallScale: number): MeshPart[] {
  const last = property.stories[property.stories.length - 1]
  if (!last) return []
  const boxFoot = footprint(property, last.id)
  const over = property.roof.overhang
  const minX = boxFoot.minX - over
  const maxX = boxFoot.maxX + over
  const minZ = boxFoot.minZ - over
  const maxZ = boxFoot.maxZ + over
  const w = maxX - minX
  const d = maxZ - minZ
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  const baseY = storyTop(property, last)
  const color = property.roof.color
  const style: RoofStyle = property.roof.style
  const pitch = property.roof.pitch
  const parts: MeshPart[] = []

  if (style === 'flat') {
    parts.push(box('roof-deck', 'roof', cx, baseY + 0.35, cz, w, 0.7, d, color))
    parts.push(box('roof-parapet-n', 'roof', cx, baseY + 1.1, maxZ, w, 1.4, 0.4 * wallScale, color))
    parts.push(box('roof-parapet-s', 'roof', cx, baseY + 1.1, minZ, w, 1.4, 0.4 * wallScale, color))
    parts.push(box('roof-parapet-w', 'roof', minX, baseY + 1.1, cz, 0.4 * wallScale, 1.4, d, color))
    parts.push(box('roof-parapet-e', 'roof', maxX, baseY + 1.1, cz, 0.4 * wallScale, 1.4, d, color))
    return parts
  }

  if (style === 'shed') {
    const rise = d * pitch
    parts.push({
      ...box('roof-shed', 'roof', cx, baseY + rise / 2, cz, w, 0.55, d + 0.4, color),
      extra: { tiltX: Math.atan(pitch) },
    })
    return parts
  }

  if (style === 'gable' || style === 'gambrel') {
    const rise = (d / 2) * pitch * (style === 'gambrel' ? 1.15 : 1)
    parts.push({
      ...box('roof-g1', 'roof', cx, baseY + rise / 2, cz - d / 4, w, 0.5, d / 2 + 0.4, color),
      extra: { tiltX: Math.atan(pitch * (style === 'gambrel' ? 1.5 : 1)) },
    })
    parts.push({
      ...box('roof-g2', 'roof', cx, baseY + rise / 2, cz + d / 4, w, 0.5, d / 2 + 0.4, color),
      extra: { tiltX: -Math.atan(pitch * (style === 'gambrel' ? 1.5 : 1)) },
    })
    if (style === 'gambrel') {
      parts.push({
        ...box('roof-g3', 'roof', cx, baseY + rise * 0.75, cz, w, 0.45, d * 0.45, color),
        extra: { tiltX: 0.18 },
      })
    }
    return parts
  }

  if (style === 'hip' || style === 'mansard') {
    const rise = (Math.min(w, d) / 2) * pitch
    const steep = style === 'mansard' ? 1.1 : 0.7
    parts.push({
      ...box('roof-h1', 'roof', cx, baseY + rise / 2, cz - d / 4, w * 0.86, 0.5, d / 2 + 0.2, color),
      extra: { tiltX: Math.atan(pitch * steep) },
    })
    parts.push({
      ...box('roof-h2', 'roof', cx, baseY + rise / 2, cz + d / 4, w * 0.86, 0.5, d / 2 + 0.2, color),
      extra: { tiltX: -Math.atan(pitch * steep) },
    })
    parts.push({
      ...box('roof-h3', 'roof', cx - w / 4, baseY + rise / 2, cz, w / 2 + 0.2, 0.5, d * 0.7, color, Math.PI / 2),
      extra: { tiltX: Math.atan(pitch * steep) },
    })
    parts.push({
      ...box('roof-h4', 'roof', cx + w / 4, baseY + rise / 2, cz, w / 2 + 0.2, 0.5, d * 0.7, color, Math.PI / 2),
      extra: { tiltX: -Math.atan(pitch * steep) },
    })
    if (style === 'mansard') {
      parts.push(box('roof-crown', 'roof', cx, baseY + rise + 0.2, cz, w * 0.45, 0.4, d * 0.45, color))
    }
    return parts
  }

  return parts
}

export function buildHouse(
  property: Property,
  options?: {
    print?: PrintProfile
    includeLot?: boolean
    storyGap?: number
    onlyStoryId?: string
    includeRoof?: boolean
  },
): MeshPart[] {
  const print = options?.print
  const storyGap = options?.storyGap ?? 0
  const wallScale = print
    ? Math.max(1, print.minWallMm / ((304.8 / print.scale) * EXTERIOR_WALL))
    : 1
  const parts: MeshPart[] = []
  const stories = options?.onlyStoryId
    ? property.stories.filter((story) => story.id === options.onlyStoryId)
    : property.stories

  if (options?.includeLot !== false && !print) {
    parts.push(
      box(
        'lot',
        'lot',
        property.lotWidth / 2,
        -0.08,
        property.lotDepth / 2,
        property.lotWidth + 16,
        0.16,
        property.lotDepth + 16,
        '#5f6d4e',
      ),
    )
  }

  stories.forEach((story) => {
    const index = property.stories.findIndex((entry) => entry.id === story.id)
    const lift = index * storyGap
    const base = storyElevation(property, story.id) + lift
    const floorY = base + story.slab
    for (const room of roomsOnStory(property, story.id)) {
      parts.push(
        box(
          `${room.id}-slab`,
          'slab',
          room.x + room.width / 2,
          base + story.slab / 2,
          room.z + room.depth / 2,
          room.width,
          Math.max(story.slab, print ? 0.35 : story.slab),
          room.depth,
          print ? '#c8c2b8' : room.floorColor,
        ),
      )
    }
    parts.push(...wallPieces(property, story.id, story.height, floorY, wallScale))
  })

  const wantRoof = options?.includeRoof ?? (!print || print.includeRoof)
  if (wantRoof) {
    const roofLift = storyGap * Math.max(0, property.stories.length - 1)
    parts.push(
      ...roofParts(property, wallScale).map((part) => ({
        ...part,
        y: part.y + roofLift,
      })),
    )
  }

  if (!print || print.includeFurniture) {
    for (const placed of property.assets) {
      const item = CATALOG_BY_ID[placed.catalogId]
      if (!item) continue
      const story = property.stories.find((entry) => entry.id === placed.storyId)
      if (!story) continue
      const index = property.stories.findIndex((entry) => entry.id === placed.storyId)
      const lift = index * storyGap
      const y = storyElevation(property, story.id) + story.slab + lift
      const hanging = item.kind === 'chandelier' || item.kind === 'ceiling-fan'
      parts.push({
        id: placed.id,
        role: 'furniture',
        shape: 'box',
        x: placed.x,
        y: hanging ? y + story.height - item.height * 0.45 : y + (item.height * placed.scale) / 2,
        z: placed.z,
        w: item.width * placed.scale,
        h: item.height * placed.scale,
        d: item.depth * placed.scale,
        rotationY: (placed.rotation * Math.PI) / 180,
        color: item.color,
        catalogId: item.id,
      })
    }
  }

  return parts
}

export function solidPrintParts(property: Property, profile: PrintProfile): MeshPart[] {
  return buildHouse(property, {
    print: profile,
    includeLot: false,
    storyGap: profile.separateStories ? 0.4 : 0,
  }).filter((part) => part.role !== 'glass' && part.role !== 'lot')
}

