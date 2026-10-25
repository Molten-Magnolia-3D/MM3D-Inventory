import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { CATALOG_BY_ID } from '../catalog'
import { assetAtPoint, openingWorld, roomAtPoint } from '../geometry'
import { roomsOnStory } from '../measurements'
import { useStudio } from '../store'
import type { Property } from '../types'

interface Draft {
  x1: number
  z1: number
  x2: number
  z2: number
}

export function FloorPlan({ property }: { property: Property }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const {
    activeStoryId,
    tool,
    selection,
    placingCatalogId,
    setSelection,
    drawRoom,
    addOpening,
    placeAsset,
    moveRoom,
    moveAsset,
    deleteSelected,
    beginHistory,
  } = useStudio()
  const [view, setView] = useState({ x: -6, z: -6, w: property.lotWidth + 20, h: property.lotDepth + 20 })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [drag, setDrag] = useState<{ kind: 'room' | 'asset'; id: string; dx: number; dz: number } | null>(null)

  const rooms = activeStoryId ? roomsOnStory(property, activeStoryId) : []
  const assets = property.assets.filter((asset) => asset.storyId === activeStoryId)
  const openings = property.openings.filter((opening) => opening.storyId === activeStoryId)

  function worldFromEvent(event: PointerEvent<SVGSVGElement> | WheelEvent) {
    const svg = svgRef.current
    if (!svg) return { x: 0, z: 0 }
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return { x: 0, z: 0 }
    const mapped = point.matrixTransform(matrix.inverse())
    return { x: mapped.x, z: mapped.y }
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const world = worldFromEvent(event)
      const factor = event.deltaY > 0 ? 1.12 : 0.88
      const nextW = Math.min(240, Math.max(24, view.w * factor))
      const nextH = nextW * (view.h / view.w)
      const rx = (world.x - view.x) / view.w
      const rz = (world.z - view.z) / view.h
      setView({
        x: world.x - rx * nextW,
        z: world.z - rz * nextH,
        w: nextW,
        h: nextH,
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [view])

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    const { x, z } = worldFromEvent(event)
    if (tool === 'room') {
      setDraft({ x1: x, z1: z, x2: x, z2: z })
      return
    }
    if (tool === 'door' || tool === 'window' || tool === 'opening') {
      addOpening(tool, x, z)
      return
    }
    if (tool === 'place') {
      placeAsset(x, z)
      return
    }
    const assetId = assetAtPoint(property, activeStoryId ?? '', x, z, (catalogId) => {
      const item = CATALOG_BY_ID[catalogId]
      return item ? { width: item.width, depth: item.depth } : { width: 3, depth: 3 }
    })
    if (assetId) {
      if (tool === 'erase') {
        setSelection({ kind: 'asset', id: assetId })
        queueMicrotask(() => deleteSelected())
        return
      }
      const asset = property.assets.find((entry) => entry.id === assetId)
      setSelection({ kind: 'asset', id: assetId })
      if (asset) {
        beginHistory()
        setDrag({ kind: 'asset', id: assetId, dx: x - asset.x, dz: z - asset.z })
      }
      return
    }
    const room = roomAtPoint(property, activeStoryId ?? '', x, z)
    if (room) {
      if (tool === 'erase') {
        setSelection({ kind: 'room', id: room.id })
        queueMicrotask(() => deleteSelected())
        return
      }
      setSelection({ kind: 'room', id: room.id })
      beginHistory()
      setDrag({ kind: 'room', id: room.id, dx: x - room.x, dz: z - room.z })
      return
    }
    setSelection(null)
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const { x, z } = worldFromEvent(event)
    if (draft) {
      setDraft({ ...draft, x2: x, z2: z })
      return
    }
    if (drag?.kind === 'room') {
      moveRoom(drag.id, x - drag.dx, z - drag.dz, false)
    }
    if (drag?.kind === 'asset') {
      moveAsset(drag.id, x - drag.dx, z - drag.dz, false)
    }
  }

  function onPointerUp() {
    if (draft) {
      drawRoom(draft.x1, draft.z1, draft.x2, draft.z2)
    }
    setDraft(null)
    setDrag(null)
  }

  const ghost = placingCatalogId ? CATALOG_BY_ID[placingCatalogId] : null

  return (
    <div className="plan-shell">
      <svg
        ref={svgRef}
        className="plan"
        viewBox={`${view.x} ${view.z} ${view.w} ${view.h}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <rect x={view.x} y={view.z} width={view.w} height={view.h} fill="#efe6d6" />
        <rect x={0} y={0} width={property.lotWidth} height={property.lotDepth} fill="#d8e0cc" stroke="#6b7a5a" strokeWidth={0.15} />
        {Array.from({ length: Math.ceil(property.lotWidth / 2) + 1 }, (_, i) => (
          <line key={`vx${i}`} x1={i * 2} y1={0} x2={i * 2} y2={property.lotDepth} stroke={i % 5 === 0 ? '#b7ae9c' : '#e2d8c6'} strokeWidth={i % 5 === 0 ? 0.08 : 0.04} />
        ))}
        {Array.from({ length: Math.ceil(property.lotDepth / 2) + 1 }, (_, i) => (
          <line key={`hz${i}`} x1={0} y1={i * 2} x2={property.lotWidth} y2={i * 2} stroke={i % 5 === 0 ? '#b7ae9c' : '#e2d8c6'} strokeWidth={i % 5 === 0 ? 0.08 : 0.04} />
        ))}
        {rooms.map((room) => {
          const selected = selection?.kind === 'room' && selection.id === room.id
          return (
            <g key={room.id}>
              <rect
                x={room.x}
                y={room.z}
                width={room.width}
                height={room.depth}
                fill={room.floorColor}
                stroke={selected ? '#c4652d' : '#1c1410'}
                strokeWidth={selected ? 0.28 : 0.16}
              />
              <text x={room.x + room.width / 2} y={room.z + room.depth / 2 - 0.4} textAnchor="middle" className="plan-label">
                {room.name}
              </text>
              <text x={room.x + room.width / 2} y={room.z + room.depth / 2 + 1.1} textAnchor="middle" className="plan-dim">
                {room.width}′ × {room.depth}′
              </text>
            </g>
          )
        })}
        {openings.map((opening) => {
          const room = property.rooms.find((entry) => entry.id === opening.roomId)
          if (!room) return null
          const world = openingWorld(room, opening)
          const selected = selection?.kind === 'opening' && selection.id === opening.id
          return (
            <g
              key={opening.id}
              transform={`translate(${world.x} ${world.z}) rotate(${world.rotation})`}
              onPointerDown={(event) => {
                event.stopPropagation()
                setSelection({ kind: 'opening', id: opening.id })
              }}
            >
              <rect
                x={-opening.width / 2}
                y={-0.28}
                width={opening.width}
                height={0.56}
                fill={opening.type === 'window' ? '#9ec5d8' : '#1c1410'}
                stroke={selected ? '#c4652d' : 'none'}
                strokeWidth={0.12}
              />
            </g>
          )
        })}
        {assets.map((placed) => {
          const item = CATALOG_BY_ID[placed.catalogId]
          if (!item) return null
          const selected = selection?.kind === 'asset' && selection.id === placed.id
          return (
            <g key={placed.id} transform={`translate(${placed.x} ${placed.z}) rotate(${placed.rotation})`}>
              <rect
                x={(-item.width * placed.scale) / 2}
                y={(-item.depth * placed.scale) / 2}
                width={item.width * placed.scale}
                height={item.depth * placed.scale}
                fill={item.color}
                opacity={0.92}
                stroke={selected ? '#c4652d' : '#1c1410'}
                strokeWidth={selected ? 0.18 : 0.08}
                rx={0.15}
              />
            </g>
          )
        })}
        {draft ? (
          <rect
            x={Math.min(draft.x1, draft.x2)}
            y={Math.min(draft.z1, draft.z2)}
            width={Math.abs(draft.x2 - draft.x1)}
            height={Math.abs(draft.z2 - draft.z1)}
            fill="rgba(196,101,45,0.18)"
            stroke="#c4652d"
            strokeWidth={0.12}
          />
        ) : null}
        {ghost && tool === 'place' ? (
          <text x={view.x + 1.2} y={view.z + 2.2} className="plan-hint">
            Click to place {ghost.name}
          </text>
        ) : null}
        <polygon points={`${property.lotWidth - 4},3 ${property.lotWidth - 2},6 ${property.lotWidth - 6},6`} fill="#1c1410" />
        <text x={property.lotWidth - 4} y={8.2} textAnchor="middle" className="plan-dim">
          N
        </text>
      </svg>
    </div>
  )
}
