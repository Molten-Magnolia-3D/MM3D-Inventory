export type Side = 'n' | 's' | 'e' | 'w'
export type OpeningType = 'door' | 'window' | 'opening'
export type RoofStyle = 'gable' | 'hip' | 'shed' | 'flat' | 'gambrel' | 'mansard'
export type Tool =
  | 'select'
  | 'room'
  | 'door'
  | 'window'
  | 'opening'
  | 'place'
  | 'erase'
export type ViewMode = 'plan' | 'orbit' | 'dollhouse' | 'walk' | 'print'
export type Screen = 'landing' | 'library' | 'studio'
export type AssetCategory =
  | 'roof'
  | 'architecture'
  | 'living'
  | 'dining'
  | 'sleep'
  | 'kitchen'
  | 'bath'
  | 'work'
  | 'utility'
  | 'decor'
  | 'outdoor'
  | 'landscape'

export type MeshKind =
  | 'sofa'
  | 'armchair'
  | 'loveseat'
  | 'coffee-table'
  | 'side-table'
  | 'dining-table'
  | 'dining-chair'
  | 'bed'
  | 'nightstand'
  | 'dresser'
  | 'wardrobe'
  | 'desk'
  | 'office-chair'
  | 'bookshelf'
  | 'tv-console'
  | 'fridge'
  | 'range'
  | 'sink'
  | 'dishwasher'
  | 'island'
  | 'toilet'
  | 'vanity'
  | 'tub'
  | 'shower'
  | 'washer'
  | 'dryer'
  | 'plant'
  | 'floor-lamp'
  | 'table-lamp'
  | 'rug'
  | 'art'
  | 'fireplace'
  | 'stairs'
  | 'column'
  | 'chimney'
  | 'railing'
  | 'fence'
  | 'tree'
  | 'car'
  | 'grill'
  | 'outdoor-table'
  | 'planter'
  | 'bench'
  | 'ceiling-fan'
  | 'chandelier'
  | 'console'
  | 'ottoman'
  | 'crib'
  | 'bar-stool'

export interface Room {
  id: string
  storyId: string
  name: string
  x: number
  z: number
  width: number
  depth: number
  wallColor: string
  floorColor: string
}

export interface Opening {
  id: string
  type: OpeningType
  storyId: string
  roomId: string
  side: Side
  offset: number
  width: number
  height: number
  sill: number
}

export interface PlacedAsset {
  id: string
  catalogId: string
  storyId: string
  x: number
  z: number
  rotation: number
  scale: number
}

export interface Story {
  id: string
  name: string
  height: number
  slab: number
}

export interface RoofSpec {
  style: RoofStyle
  pitch: number
  overhang: number
  color: string
}

export interface Listing {
  price: number
  beds: number
  baths: number
  realtor: string
  brokerage: string
  summary: string
  status: 'draft' | 'staged' | 'ready'
}

export interface Property {
  id: string
  name: string
  address: string
  city: string
  lotWidth: number
  lotDepth: number
  stories: Story[]
  rooms: Room[]
  openings: Opening[]
  assets: PlacedAsset[]
  roof: RoofSpec
  listing: Listing
  updatedAt: number
}

export interface CatalogItem {
  id: string
  name: string
  category: AssetCategory
  kind: MeshKind
  description: string
  width: number
  depth: number
  height: number
  color: string
  accent: string
  tags: string[]
}

export interface Selection {
  kind: 'room' | 'asset' | 'opening'
  id: string
}

export interface PrintProfile {
  scale: number
  minWallMm: number
  includeRoof: boolean
  includeFurniture: boolean
  separateStories: boolean
}
