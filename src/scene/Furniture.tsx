import type { CatalogItem } from '../types'

interface Props {
  item: CatalogItem
  color?: string
}

function Box({
  w,
  h,
  d,
  y = 0,
  x = 0,
  z = 0,
  color,
}: {
  w: number
  h: number
  d: number
  y?: number
  x?: number
  z?: number
  color: string
}) {
  return (
    <mesh position={[x, y, z] as [number, number, number]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.72} metalness={0.04} />
    </mesh>
  )
}

function Cyl({
  r,
  h,
  y = 0,
  x = 0,
  z = 0,
  color,
}: {
  r: number
  h: number
  y?: number
  x?: number
  z?: number
  color: string
}) {
  return (
    <mesh position={[x, y, z] as [number, number, number]} castShadow>
      <cylinderGeometry args={[r, r, h, 16]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  )
}

export function FurnitureMesh({ item, color }: Props) {
  const c = color ?? item.color
  const a = item.accent
  const w = item.width
  const d = item.depth
  const h = item.height

  switch (item.kind) {
    case 'sofa':
    case 'loveseat':
      return (
        <group>
          <Box w={w} h={h * 0.42} d={d} y={h * 0.28} color={c} />
          <Box w={w} h={h * 0.55} d={d * 0.22} y={h * 0.55} z={-d * 0.36} color={c} />
          <Box w={0.28} h={h * 0.5} d={d} y={h * 0.45} x={-w / 2 + 0.18} color={a} />
          <Box w={0.28} h={h * 0.5} d={d} y={h * 0.45} x={w / 2 - 0.18} color={a} />
        </group>
      )
    case 'armchair':
      return (
        <group>
          <Box w={w * 0.86} h={h * 0.38} d={d * 0.86} y={h * 0.28} color={c} />
          <Box w={w * 0.86} h={h * 0.55} d={0.22} y={h * 0.52} z={-d * 0.32} color={c} />
          <Box w={0.2} h={h * 0.45} d={d * 0.8} y={h * 0.42} x={-w * 0.36} color={a} />
          <Box w={0.2} h={h * 0.45} d={d * 0.8} y={h * 0.42} x={w * 0.36} color={a} />
        </group>
      )
    case 'ottoman':
      return <Box w={w} h={h} d={d} y={h / 2} color={c} />
    case 'coffee-table':
    case 'side-table':
    case 'dining-table':
    case 'outdoor-table':
    case 'console':
    case 'desk':
      return (
        <group>
          <Box w={w} h={0.16} d={d} y={h - 0.08} color={c} />
          <Box w={0.16} h={h - 0.16} d={0.16} y={(h - 0.16) / 2} x={-w / 2 + 0.2} z={-d / 2 + 0.2} color={a} />
          <Box w={0.16} h={h - 0.16} d={0.16} y={(h - 0.16) / 2} x={w / 2 - 0.2} z={-d / 2 + 0.2} color={a} />
          <Box w={0.16} h={h - 0.16} d={0.16} y={(h - 0.16) / 2} x={-w / 2 + 0.2} z={d / 2 - 0.2} color={a} />
          <Box w={0.16} h={h - 0.16} d={0.16} y={(h - 0.16) / 2} x={w / 2 - 0.2} z={d / 2 - 0.2} color={a} />
        </group>
      )
    case 'dining-chair':
    case 'office-chair':
      return (
        <group>
          <Box w={w * 0.9} h={0.14} d={d * 0.8} y={h * 0.42} color={c} />
          <Box w={w * 0.9} h={h * 0.42} d={0.12} y={h * 0.7} z={-d * 0.32} color={c} />
          <Cyl r={0.08} h={h * 0.4} y={h * 0.2} x={-w * 0.28} z={-d * 0.24} color={a} />
          <Cyl r={0.08} h={h * 0.4} y={h * 0.2} x={w * 0.28} z={-d * 0.24} color={a} />
          <Cyl r={0.08} h={h * 0.4} y={h * 0.2} x={-w * 0.28} z={d * 0.24} color={a} />
          <Cyl r={0.08} h={h * 0.4} y={h * 0.2} x={w * 0.28} z={d * 0.24} color={a} />
        </group>
      )
    case 'bar-stool':
      return (
        <group>
          <Cyl r={w * 0.28} h={0.12} y={h * 0.62} color={c} />
          <Cyl r={0.08} h={h * 0.6} y={h * 0.3} color={a} />
          <Cyl r={w * 0.22} h={0.08} y={0.05} color={a} />
        </group>
      )
    case 'bed':
      return (
        <group>
          <Box w={w} h={0.45} d={d} y={0.55} color={c} />
          <Box w={w + 0.1} h={h * 0.7} d={0.22} y={h * 0.5} z={-d / 2 + 0.1} color={a} />
          <Box w={w * 0.36} h={0.22} d={0.4} y={1.05} x={-w * 0.22} z={-d / 2 + 0.55} color="#f4efe6" />
          <Box w={w * 0.36} h={0.22} d={0.4} y={1.05} x={w * 0.22} z={-d / 2 + 0.55} color="#f4efe6" />
        </group>
      )
    case 'crib':
      return (
        <group>
          <Box w={w} h={0.3} d={d} y={0.7} color={c} />
          <Box w={w} h={h} d={0.1} y={h / 2} z={-d / 2} color={a} />
          <Box w={w} h={h} d={0.1} y={h / 2} z={d / 2} color={a} />
          <Box w={0.1} h={h} d={d} y={h / 2} x={-w / 2} color={a} />
          <Box w={0.1} h={h} d={d} y={h / 2} x={w / 2} color={a} />
        </group>
      )
    case 'nightstand':
    case 'dresser':
    case 'wardrobe':
    case 'bookshelf':
    case 'tv-console':
    case 'vanity':
    case 'island':
      return (
        <group>
          <Box w={w} h={h} d={d} y={h / 2} color={c} />
          <Box w={w * 0.92} h={0.06} d={d * 0.08} y={h * 0.62} z={d / 2 - 0.06} color={a} />
          {item.kind === 'bookshelf' ? (
            <>
              <Box w={w * 0.9} h={0.08} d={d * 0.85} y={h * 0.33} color={a} />
              <Box w={w * 0.9} h={0.08} d={d * 0.85} y={h * 0.62} color={a} />
            </>
          ) : null}
        </group>
      )
    case 'fridge':
    case 'dishwasher':
    case 'washer':
    case 'dryer':
    case 'range':
      return (
        <group>
          <Box w={w} h={h} d={d} y={h / 2} color={c} />
          <Box w={w * 0.7} h={h * 0.18} d={0.04} y={h * 0.72} z={d / 2 + 0.01} color={a} />
        </group>
      )
    case 'sink':
      return (
        <group>
          <Box w={w} h={h * 0.72} d={d} y={h * 0.36} color={c} />
          <Box w={w * 0.55} h={0.16} d={d * 0.45} y={h * 0.78} color="#9ec5d8" />
        </group>
      )
    case 'toilet':
      return (
        <group>
          <Cyl r={w * 0.42} h={0.45} y={1.05} color={c} />
          <Box w={w * 0.85} h={0.7} d={d * 0.45} y={0.7} z={d * 0.18} color={c} />
        </group>
      )
    case 'tub':
      return (
        <group>
          <Cyl r={w * 0.28} h={h} y={h / 2} color={c} />
          <Box w={w * 0.7} h={h * 0.85} d={d * 0.7} y={h * 0.42} color={c} />
        </group>
      )
    case 'shower':
      return (
        <group>
          <Box w={w} h={0.16} d={d} y={0.08} color={a} />
          <Box w={w} h={h} d={0.06} y={h / 2} z={-d / 2} color="#d5e6ee" />
          <Box w={0.06} h={h} d={d} y={h / 2} x={-w / 2} color="#d5e6ee" />
          <Box w={0.06} h={h} d={d} y={h / 2} x={w / 2} color="#d5e6ee" />
        </group>
      )
    case 'plant':
    case 'tree':
      return (
        <group>
          <Cyl r={item.kind === 'tree' ? 0.35 : 0.18} h={h * 0.35} y={h * 0.18} color="#5a3b24" />
          <mesh position={[0, h * 0.62, 0] as [number, number, number]} castShadow>
            <sphereGeometry args={[Math.max(w, d) * 0.38, 16, 12]} />
            <meshStandardMaterial color={c} roughness={0.85} />
          </mesh>
        </group>
      )
    case 'floor-lamp':
    case 'table-lamp':
      return (
        <group>
          <Cyl r={0.12} h={h * 0.75} y={h * 0.38} color={a} />
          <Cyl r={w * 0.35} h={h * 0.22} y={h * 0.86} color={c} />
        </group>
      )
    case 'rug':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0] as [number, number, number]} position={[0, 0.03, 0] as [number, number, number]} receiveShadow>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color={c} roughness={0.95} />
        </mesh>
      )
    case 'art':
      return <Box w={w} h={h} d={0.12} y={h / 2 + 1.4} color={c} />
    case 'chandelier':
      return (
        <group>
          <Cyl r={0.06} h={h * 0.5} y={h * 0.7} color={a} />
          <Cyl r={w * 0.28} h={0.12} y={h * 0.4} color={c} />
          <Cyl r={w * 0.16} h={0.12} y={h * 0.22} color={c} />
        </group>
      )
    case 'ceiling-fan':
      return (
        <group>
          <Cyl r={0.12} h={0.5} y={h * 0.7} color={a} />
          <Box w={w} h={0.08} d={0.35} y={h * 0.42} color={c} />
          <Box w={0.35} h={0.08} d={d} y={h * 0.42} color={c} />
        </group>
      )
    case 'fireplace':
      return (
        <group>
          <Box w={w} h={h} d={d} y={h / 2} color={c} />
          <Box w={w * 0.45} h={h * 0.32} d={d * 0.3} y={h * 0.28} z={d * 0.2} color="#1c1410" />
        </group>
      )
    case 'stairs':
      return (
        <group>
          {Array.from({ length: 10 }, (_, i) => (
            <Box
              key={i}
              w={w}
              h={0.18}
              d={d / 10}
              y={0.2 + i * (h / 10)}
              z={-d / 2 + (i + 0.5) * (d / 10)}
              color={i % 2 === 0 ? c : a}
            />
          ))}
        </group>
      )
    case 'column':
      return <Cyl r={w * 0.28} h={h} y={h / 2} color={c} />
    case 'chimney':
      return (
        <group>
          <Box w={w} h={h} d={d} y={h / 2} color={c} />
          <Box w={w * 1.15} h={0.4} d={d * 1.15} y={h} color={a} />
        </group>
      )
    case 'railing':
    case 'fence':
      return (
        <group>
          <Box w={w} h={0.12} d={d} y={h * 0.85} color={c} />
          <Box w={w} h={0.12} d={d} y={h * 0.45} color={c} />
          {Array.from({ length: 7 }, (_, i) => (
            <Box key={i} w={0.1} h={h} d={d} y={h / 2} x={-w / 2 + (i + 0.5) * (w / 7)} color={a} />
          ))}
        </group>
      )
    case 'car':
      return (
        <group>
          <Box w={w} h={h * 0.38} d={d} y={h * 0.32} color={c} />
          <Box w={w * 0.86} h={h * 0.32} d={d * 0.55} y={h * 0.62} z={-d * 0.05} color={c} />
          <Cyl r={0.38} h={0.22} y={0.38} x={-w * 0.32} z={-d * 0.28} color="#1c1410" />
          <Cyl r={0.38} h={0.22} y={0.38} x={w * 0.32} z={-d * 0.28} color="#1c1410" />
          <Cyl r={0.38} h={0.22} y={0.38} x={-w * 0.32} z={d * 0.28} color="#1c1410" />
          <Cyl r={0.38} h={0.22} y={0.38} x={w * 0.32} z={d * 0.28} color="#1c1410" />
        </group>
      )
    case 'grill':
      return (
        <group>
          <Box w={w} h={h * 0.45} d={d} y={h * 0.45} color={c} />
          <Box w={w * 0.8} h={0.1} d={d * 0.7} y={h * 0.75} color={a} />
        </group>
      )
    case 'planter':
      return (
        <group>
          <Cyl r={w * 0.35} h={h * 0.45} y={h * 0.22} color={c} />
          <mesh position={[0, h * 0.62, 0] as [number, number, number]} castShadow>
            <sphereGeometry args={[w * 0.32, 12, 10]} />
            <meshStandardMaterial color={a} />
          </mesh>
        </group>
      )
    case 'bench':
      return (
        <group>
          <Box w={w} h={0.16} d={d} y={h * 0.48} color={c} />
          <Box w={w} h={h * 0.4} d={0.12} y={h * 0.72} z={-d * 0.35} color={c} />
          <Box w={0.14} h={h * 0.45} d={0.14} y={h * 0.22} x={-w / 2 + 0.2} z={d * 0.3} color={a} />
          <Box w={0.14} h={h * 0.45} d={0.14} y={h * 0.22} x={w / 2 - 0.2} z={d * 0.3} color={a} />
        </group>
      )
    default:
      return <Box w={w} h={h} d={d} y={h / 2} color={c} />
  }
}
