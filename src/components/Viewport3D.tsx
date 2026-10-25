import { Canvas } from '@react-three/fiber'
import { HouseScene } from '../scene/HouseScene'
import { useStudio } from '../store'
import type { Property } from '../types'

export function Viewport3D({ property }: { property: Property }) {
  const { viewMode, activeStoryId, print, selection } = useStudio()
  return (
    <div className="viewport">
      <Canvas shadows camera={{ position: [20, 36, 48], fov: 42, near: 0.1, far: 400 }}>
        <HouseScene
          property={property}
          viewMode={viewMode}
          activeStoryId={activeStoryId}
          print={print}
          selectedId={selection?.kind === 'asset' ? selection.id : null}
        />
      </Canvas>
    </div>
  )
}
