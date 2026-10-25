import { BufferAttribute, BufferGeometry, Matrix4, Mesh, BoxGeometry, CylinderGeometry, ConeGeometry } from 'three'
import type { MeshPart } from './buildHouse'
import { solidPrintParts } from './buildHouse'
import { feetToPrintMm } from './measurements'
import type { PrintProfile, Property } from './types'

function geometryFor(part: MeshPart): BufferGeometry {
  if (part.shape === 'cylinder') {
    return new CylinderGeometry(part.w / 2, part.w / 2, part.h, 14)
  }
  if (part.shape === 'cone') {
    return new ConeGeometry(part.w / 2, part.h, 12)
  }
  return new BoxGeometry(part.w, part.h, part.d)
}

export function partsToGeometry(parts: MeshPart[], scale: number): BufferGeometry {
  const positions: number[] = []
  const matrix = new Matrix4()

  for (const part of parts) {
    const geometry = geometryFor(part)
    const mesh = new Mesh(geometry)
    mesh.position.set(part.x, part.y, part.z)
    mesh.rotation.y = part.rotationY
    if (part.extra?.tiltX) mesh.rotation.x = part.extra.tiltX
    mesh.updateMatrixWorld(true)
    matrix.copy(mesh.matrixWorld)

    const position = geometry.getAttribute('position')
    const index = geometry.getIndex()
    const pushVertex = (i: number) => {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      const world = [x, y, z, 1] as [number, number, number, number]
      const out = world.slice() as number[]
      const e = matrix.elements
      out[0] = e[0] * world[0] + e[4] * world[1] + e[8] * world[2] + e[12]
      out[1] = e[1] * world[0] + e[5] * world[1] + e[9] * world[2] + e[13]
      out[2] = e[2] * world[0] + e[6] * world[1] + e[10] * world[2] + e[14]
      positions.push(
        feetToPrintMm(out[0], scale),
        feetToPrintMm(out[1], scale),
        feetToPrintMm(out[2], scale),
      )
    }

    if (index) {
      for (let i = 0; i < index.count; i += 1) pushVertex(index.getX(i))
    } else {
      for (let i = 0; i < position.count; i += 1) pushVertex(i)
    }
    geometry.dispose()
  }

  const merged = new BufferGeometry()
  merged.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  merged.computeVertexNormals()
  return merged
}

export function geometryToBinaryStl(geometry: BufferGeometry): ArrayBuffer {
  const position = geometry.getAttribute('position')
  const triangleCount = position.count / 3
  const buffer = new ArrayBuffer(84 + triangleCount * 50)
  const view = new DataView(buffer)
  const header = 'Molten Magnolia Homestead printable house'
  for (let i = 0; i < header.length; i += 1) view.setUint8(i, header.charCodeAt(i))
  view.setUint32(80, triangleCount, true)

  let offset = 84
  for (let i = 0; i < position.count; i += 3) {
    const ax = position.getX(i)
    const ay = position.getY(i)
    const az = position.getZ(i)
    const bx = position.getX(i + 1)
    const by = position.getY(i + 1)
    const bz = position.getZ(i + 1)
    const cx = position.getX(i + 2)
    const cy = position.getY(i + 2)
    const cz = position.getZ(i + 2)
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay)
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az)
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    const len = Math.hypot(nx, ny, nz) || 1
    view.setFloat32(offset, nx / len, true)
    view.setFloat32(offset + 4, ny / len, true)
    view.setFloat32(offset + 8, nz / len, true)
    view.setFloat32(offset + 12, ax, true)
    view.setFloat32(offset + 16, ay, true)
    view.setFloat32(offset + 20, az, true)
    view.setFloat32(offset + 24, bx, true)
    view.setFloat32(offset + 28, by, true)
    view.setFloat32(offset + 32, bz, true)
    view.setFloat32(offset + 36, cx, true)
    view.setFloat32(offset + 40, cy, true)
    view.setFloat32(offset + 44, cz, true)
    view.setUint16(offset + 48, 0, true)
    offset += 50
  }
  return buffer
}

export function exportPropertyStl(property: Property, profile: PrintProfile): ArrayBuffer {
  const parts = solidPrintParts(property, profile)
  const geometry = partsToGeometry(parts, profile.scale)
  const bytes = geometryToBinaryStl(geometry)
  geometry.dispose()
  return bytes
}

export function downloadBuffer(filename: string, buffer: ArrayBuffer, type: string): void {
  const blob = new Blob([buffer], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function propertyToJson(property: Property): string {
  return JSON.stringify(property, null, 2)
}
