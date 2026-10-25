import { ContactShadows, OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { buildHouse } from '../buildHouse'
import { CATALOG_BY_ID } from '../catalog'
import { roomsOnStory, storyElevation } from '../measurements'
import type { PrintProfile, Property, ViewMode } from '../types'
import { FurnitureMesh } from './Furniture'

interface Props {
  property: Property
  viewMode: ViewMode
  activeStoryId: string | null
  print: PrintProfile
  selectedId: string | null
}

function ArchitecturalPart({
  part,
  printLike,
}: {
  part: ReturnType<typeof buildHouse>[number]
  printLike: boolean
}) {
  const isGlass = part.role === 'glass'
  const color = printLike ? '#b9b3a8' : part.color
  return (
    <mesh
      position={[part.x, part.y, part.z] as [number, number, number]}
      rotation={[part.extra?.tiltX ?? 0, part.rotationY, 0] as [number, number, number]}
      castShadow={!isGlass}
      receiveShadow
    >
      <boxGeometry args={[part.w, part.h, part.d]} />
      <meshStandardMaterial
        color={color}
        transparent={isGlass}
        opacity={isGlass ? 0.32 : 1}
        roughness={printLike ? 0.9 : isGlass ? 0.1 : 0.74}
        metalness={isGlass ? 0.15 : 0.02}
      />
    </mesh>
  )
}

function focusPoint(property: Property, activeStoryId: string | null) {
  const rooms = activeStoryId ? roomsOnStory(property, activeStoryId) : property.rooms
  const focus = [...rooms].sort((a, b) => b.width * b.depth - a.width * a.depth)[0]
  const cx = focus ? focus.x + focus.width / 2 : property.lotWidth / 2
  const cz = focus ? focus.z + focus.depth / 2 : property.lotDepth / 2
  return { focus, cx, cz }
}

function CameraRig({
  property,
  viewMode,
  activeStoryId,
}: {
  property: Property
  viewMode: ViewMode
  activeStoryId: string | null
}) {
  const { camera } = useThree()
  useEffect(() => {
    const { focus, cx, cz } = focusPoint(property, activeStoryId)
    const story = property.stories.find((entry) => entry.id === activeStoryId) ?? property.stories[0]
    const floor = story ? storyElevation(property, story.id) + story.slab : 0
    if (viewMode === 'walk' && focus) {
      const eye = floor + 5.2
      camera.position.set(cx, eye, focus.z + Math.min(2.8, focus.depth * 0.28))
      camera.lookAt(cx, eye, focus.z + focus.depth * 0.78)
    } else if (viewMode === 'print') {
      camera.position.set(property.lotWidth * 0.9, 48, property.lotDepth * 1.1)
      camera.lookAt(cx, floor + 4, cz)
    } else if (viewMode === 'dollhouse') {
      camera.position.set(property.lotWidth * 0.15, 56, property.lotDepth * 1.15)
      camera.lookAt(cx, 8, cz)
    } else {
      camera.position.set(property.lotWidth * 0.2, 42, property.lotDepth * 1.05)
      camera.lookAt(cx, floor + 4, cz)
    }
  }, [camera, property, viewMode, activeStoryId])
  return null
}

export function HouseScene({ property, viewMode, activeStoryId, print, selectedId }: Props) {
  const storyGap = viewMode === 'dollhouse' ? 10 : 0
  const printLike = viewMode === 'print'
  const walk = viewMode === 'walk'
  const { focus, cx } = focusPoint(property, activeStoryId)
  const story = property.stories.find((entry) => entry.id === activeStoryId) ?? property.stories[0]
  const eyeY = story ? storyElevation(property, story.id) + story.slab + 5.2 : 5.2
  const parts = useMemo(
    () =>
      buildHouse(property, {
        storyGap,
        includeLot: !printLike && !walk,
        includeRoof: !walk,
        onlyStoryId: walk ? activeStoryId ?? undefined : undefined,
        print: printLike
          ? { ...print, includeFurniture: print.includeFurniture }
          : undefined,
      }),
    [property, storyGap, printLike, print, walk, activeStoryId],
  )

  const architecture = parts.filter((part) => part.role !== 'furniture')
  const furniture = (printLike && !print.includeFurniture ? [] : property.assets).filter((placed) =>
    walk ? placed.storyId === activeStoryId : true,
  )

  return (
    <>
      <color attach="background" args={[printLike ? '#d8d2c8' : '#cfd6c6']} />
      <ambientLight intensity={0.52} />
      <hemisphereLight args={['#f6efe4', '#6b7a5a', 0.48]} />
      <directionalLight
        position={[50, 70, 24] as [number, number, number]}
        intensity={1.55}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <CameraRig property={property} viewMode={viewMode} activeStoryId={activeStoryId} />
      <group>
        {architecture.map((part) => (
          <ArchitecturalPart key={part.id} part={part} printLike={printLike} />
        ))}
        {furniture.map((placed) => {
          const item = CATALOG_BY_ID[placed.catalogId]
          if (!item) return null
          const story = property.stories.find((entry) => entry.id === placed.storyId)
          if (!story) return null
          const index = property.stories.findIndex((entry) => entry.id === placed.storyId)
          const y = storyElevation(property, story.id) + story.slab + index * storyGap
          const hanging = item.kind === 'chandelier' || item.kind === 'ceiling-fan'
          const selected = placed.id === selectedId
          return (
            <group
              key={placed.id}
              position={[placed.x, hanging ? y + story.height - item.height : y, placed.z] as [number, number, number]}
              rotation={[0, (placed.rotation * Math.PI) / 180, 0] as [number, number, number]}
              scale={placed.scale}
            >
              <FurnitureMesh item={item} />
              {selected ? (
                <mesh position={[0, item.height / 2, 0] as [number, number, number]}>
                  <boxGeometry args={[item.width + 0.4, item.height + 0.4, item.depth + 0.4]} />
                  <meshBasicMaterial color="#c4652d" wireframe />
                </mesh>
              ) : null}
            </group>
          )
        })}
      </group>
      {walk && story ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0] as [number, number, number]}
          position={[property.lotWidth / 2, storyElevation(property, story.id) + story.slab - 0.04, property.lotDepth / 2] as [number, number, number]}
          receiveShadow
        >
          <planeGeometry args={[property.lotWidth + 20, property.lotDepth + 20]} />
          <meshStandardMaterial color="#d8e0cc" />
        </mesh>
      ) : null}
      {printLike ? (
        <mesh rotation={[-Math.PI / 2, 0, 0] as [number, number, number]} position={[property.lotWidth / 2, -0.2, property.lotDepth / 2] as [number, number, number]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color="#cfc8bc" />
        </mesh>
      ) : (
        <ContactShadows position={[0, -0.02, 0] as [number, number, number]} opacity={0.32} scale={180} blur={2.2} />
      )}
      <OrbitControls
        key={`${viewMode}-${activeStoryId}`}
        makeDefault
        enableDamping
        maxPolarAngle={walk ? Math.PI / 1.92 : Math.PI / 2.1}
        minDistance={walk ? 1.2 : 8}
        maxDistance={walk ? 36 : 160}
        target={
          walk && focus
            ? [cx, eyeY, focus.z + focus.depth * 0.72]
            : [property.lotWidth / 2, walk ? eyeY : 4, property.lotDepth / 2]
        }
      />
    </>
  )
}
