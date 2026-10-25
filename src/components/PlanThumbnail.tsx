import { roomsOnStory } from '../measurements'
import type { Property } from '../types'

export function PlanThumbnail({ property }: { property: Property }) {
  const story = property.stories[0]
  const rooms = story ? roomsOnStory(property, story.id) : []
  const pad = 4
  const width = property.lotWidth
  const depth = property.lotDepth
  return (
    <svg className="thumb" viewBox={`${-pad} ${-pad} ${width + pad * 2} ${depth + pad * 2}`} role="img" aria-label={`${property.name} floor plate`}>
      <rect x={-pad} y={-pad} width={width + pad * 2} height={depth + pad * 2} fill="#efe4d4" />
      <rect x={0} y={0} width={width} height={depth} fill="#dce3d2" stroke="#8a8f86" strokeWidth={0.4} />
      {rooms.map((room) => (
        <rect
          key={room.id}
          x={room.x}
          y={room.z}
          width={room.width}
          height={room.depth}
          fill={room.floorColor}
          stroke="#1c1410"
          strokeWidth={0.35}
          opacity={0.92}
        />
      ))}
    </svg>
  )
}
