import { create } from 'zustand'
import { CATALOG_BY_ID } from './catalog'
import { nearestEdge, normalizeRoom, roomAtPoint } from './geometry'
import { uid } from './ids'
import { emptyProperty, seedListings } from './listings'
import { clamp, snap } from './measurements'
import { loadProjects, saveProjects } from './persistence'
import type {
  OpeningType,
  PrintProfile,
  Property,
  RoofStyle,
  Screen,
  Selection,
  Tool,
  ViewMode,
} from './types'

const HISTORY_LIMIT = 40

interface StudioState {
  screen: Screen
  projects: Property[]
  activeId: string | null
  activeStoryId: string | null
  tool: Tool
  viewMode: ViewMode
  selection: Selection | null
  placingCatalogId: string | null
  query: string
  category: string
  print: PrintProfile
  past: Property[]
  future: Property[]
  setScreen: (screen: Screen) => void
  openProject: (id: string) => void
  newProject: () => void
  duplicateProject: (id: string) => void
  deleteProject: (id: string) => void
  importProject: (property: Property) => void
  resetSamples: () => void
  setTool: (tool: Tool) => void
  setViewMode: (mode: ViewMode) => void
  setSelection: (selection: Selection | null) => void
  setPlacing: (catalogId: string | null) => void
  setQuery: (query: string) => void
  setCategory: (category: string) => void
  setPrint: (patch: Partial<PrintProfile>) => void
  setStory: (storyId: string) => void
  updateActive: (recipe: (property: Property) => Property, record?: boolean) => void
  addStory: () => void
  removeStory: (storyId: string) => void
  renameStory: (storyId: string, name: string) => void
  drawRoom: (x1: number, z1: number, x2: number, z2: number) => void
  beginHistory: () => void
  moveRoom: (id: string, x: number, z: number, record?: boolean) => void
  resizeRoom: (id: string, width: number, depth: number) => void
  updateRoom: (id: string, patch: Partial<Property['rooms'][number]>) => void
  deleteSelected: () => void
  addOpening: (type: OpeningType, x: number, z: number) => void
  placeAsset: (x: number, z: number) => void
  moveAsset: (id: string, x: number, z: number, record?: boolean) => void
  rotateAsset: (id: string, delta: number) => void
  updateAsset: (id: string, patch: Partial<Property['assets'][number]>) => void
  applyRoof: (style: RoofStyle) => void
  updateListing: (patch: Partial<Property['listing']>) => void
  updateMeta: (patch: Partial<Pick<Property, 'name' | 'address' | 'city' | 'lotWidth' | 'lotDepth'>>) => void
  updateRoof: (patch: Partial<Property['roof']>) => void
  undo: () => void
  redo: () => void
}

function persist(projects: Property[]): Property[] {
  saveProjects(projects)
  return projects
}

function replaceActive(projects: Property[], activeId: string | null, next: Property): Property[] {
  return persist(projects.map((project) => (project.id === activeId ? next : project)))
}

export const useStudio = create<StudioState>((set, get) => ({
  screen: 'landing',
  projects: typeof localStorage === 'undefined' ? seedListings() : loadProjects(),
  activeId: null,
  activeStoryId: null,
  tool: 'select',
  viewMode: 'orbit',
  selection: null,
  placingCatalogId: null,
  query: '',
  category: 'living',
  print: {
    scale: 200,
    minWallMm: 1.6,
    includeRoof: true,
    includeFurniture: false,
    separateStories: false,
  },
  past: [],
  future: [],
  setScreen: (screen) => set({ screen }),
  openProject: (id) => {
    const project = get().projects.find((entry) => entry.id === id)
    set({
      screen: 'studio',
      activeId: id,
      activeStoryId: project?.stories[0]?.id ?? null,
      selection: null,
      past: [],
      future: [],
      viewMode: 'orbit',
      tool: 'select',
    })
  },
  newProject: () => {
    const project = emptyProperty('New listing')
    set((state) => ({
      projects: persist([project, ...state.projects]),
      activeId: project.id,
      activeStoryId: project.stories[0].id,
      screen: 'studio',
      selection: null,
      past: [],
      future: [],
      tool: 'room',
      viewMode: 'plan',
    }))
  },
  duplicateProject: (id) => {
    const source = get().projects.find((entry) => entry.id === id)
    if (!source) return
    const copy: Property = {
      ...structuredClone(source),
      id: uid('home'),
      name: `${source.name} copy`,
      updatedAt: Date.now(),
    }
    set((state) => ({ projects: persist([copy, ...state.projects]) }))
  },
  deleteProject: (id) => {
    set((state) => ({
      projects: persist(state.projects.filter((project) => project.id !== id)),
      activeId: state.activeId === id ? null : state.activeId,
      screen: state.activeId === id ? 'library' : state.screen,
    }))
  },
  importProject: (property) => {
    const incoming: Property = {
      ...property,
      id: property.id || uid('home'),
      updatedAt: Date.now(),
    }
    set((state) => ({
      projects: persist([incoming, ...state.projects.filter((project) => project.id !== incoming.id)]),
      activeId: incoming.id,
      activeStoryId: incoming.stories[0]?.id ?? null,
      screen: 'studio',
    }))
  },
  resetSamples: () => set({ projects: persist(seedListings()), screen: 'library' }),
  setTool: (tool) =>
    set({
      tool,
      placingCatalogId: tool === 'place' ? get().placingCatalogId : null,
    }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelection: (selection) => set({ selection }),
  setPlacing: (placingCatalogId) =>
    set({
      placingCatalogId,
      tool: placingCatalogId ? 'place' : 'select',
      category: placingCatalogId
        ? CATALOG_BY_ID[placingCatalogId]?.category ?? get().category
        : get().category,
    }),
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  setPrint: (patch) => set((state) => ({ print: { ...state.print, ...patch } })),
  setStory: (activeStoryId) => set({ activeStoryId, selection: null }),
  beginHistory: () => {
    const { activeId, projects, past } = get()
    const current = projects.find((project) => project.id === activeId)
    if (!current) return
    set({ past: [...past.slice(-HISTORY_LIMIT + 1), current], future: [] })
  },
  updateActive: (recipe, record = true) => {
    const { activeId, projects, past } = get()
    const current = projects.find((project) => project.id === activeId)
    if (!current) return
    const next = { ...recipe(structuredClone(current)), updatedAt: Date.now() }
    set({
      projects: replaceActive(projects, activeId, next),
      past: record ? [...past.slice(-HISTORY_LIMIT + 1), current] : past,
      future: record ? [] : get().future,
    })
  },
  addStory: () => {
    get().updateActive((property) => ({
      ...property,
      stories: [
        ...property.stories,
        {
          id: uid('story'),
          name: `Story ${property.stories.length + 1}`,
          height: 9,
          slab: 0.75,
        },
      ],
    }))
    const latest = get().projects.find((project) => project.id === get().activeId)
    const last = latest?.stories[latest.stories.length - 1]
    if (last) set({ activeStoryId: last.id })
  },
  removeStory: (storyId) => {
    get().updateActive((property) => {
      if (property.stories.length <= 1) return property
      return {
        ...property,
        stories: property.stories.filter((story) => story.id !== storyId),
        rooms: property.rooms.filter((room) => room.storyId !== storyId),
        openings: property.openings.filter((opening) => opening.storyId !== storyId),
        assets: property.assets.filter((asset) => asset.storyId !== storyId),
      }
    })
    const latest = get().projects.find((project) => project.id === get().activeId)
    if (latest) set({ activeStoryId: latest.stories[0]?.id ?? null })
  },
  renameStory: (storyId, name) => {
    get().updateActive((property) => ({
      ...property,
      stories: property.stories.map((story) => (story.id === storyId ? { ...story, name } : story)),
    }))
  },
  drawRoom: (x1, z1, x2, z2) => {
    const storyId = get().activeStoryId
    if (!storyId) return
    const box = normalizeRoom(snap(x1), snap(z1), snap(x2), snap(z2))
    const id = uid('room')
    get().updateActive((property) => ({
      ...property,
      rooms: [
        ...property.rooms,
        {
          id,
          storyId,
          name: `Room ${property.rooms.filter((room) => room.storyId === storyId).length + 1}`,
          ...box,
          wallColor: '#f4efe6',
          floorColor: '#c4a882',
        },
      ],
    }))
    set({ selection: { kind: 'room', id }, tool: 'select' })
  },
  moveRoom: (id, x, z, record = true) => {
    get().updateActive(
      (property) => ({
        ...property,
        rooms: property.rooms.map((room) =>
          room.id === id ? { ...room, x: snap(x), z: snap(z) } : room,
        ),
      }),
      record,
    )
  },
  resizeRoom: (id, width, depth) => {
    get().updateActive((property) => ({
      ...property,
      rooms: property.rooms.map((room) =>
        room.id === id
          ? { ...room, width: clamp(snap(width), 4, 80), depth: clamp(snap(depth), 4, 80) }
          : room,
      ),
    }))
  },
  updateRoom: (id, patch) => {
    get().updateActive((property) => ({
      ...property,
      rooms: property.rooms.map((room) => (room.id === id ? { ...room, ...patch } : room)),
    }))
  },
  deleteSelected: () => {
    const { selection } = get()
    if (!selection) return
    get().updateActive((property) => {
      if (selection.kind === 'room') {
        return {
          ...property,
          rooms: property.rooms.filter((room) => room.id !== selection.id),
          openings: property.openings.filter((opening) => opening.roomId !== selection.id),
        }
      }
      if (selection.kind === 'asset') {
        return {
          ...property,
          assets: property.assets.filter((asset) => asset.id !== selection.id),
        }
      }
      return {
        ...property,
        openings: property.openings.filter((opening) => opening.id !== selection.id),
      }
    })
    set({ selection: null })
  },
  addOpening: (type, x, z) => {
    const { activeId, activeStoryId, projects } = get()
    const property = projects.find((project) => project.id === activeId)
    if (!property || !activeStoryId) return
    const room = roomAtPoint(property, activeStoryId, x, z)
    if (!room) return
    const edge = nearestEdge(room, x, z)
    const width = type === 'window' ? 4 : type === 'door' ? 3 : 4
    const height = type === 'window' ? 4.5 : 7
    const sill = type === 'window' ? 2.6 : 0
    const id = uid('open')
    get().updateActive((current) => ({
      ...current,
      openings: [
        ...current.openings,
        {
          id,
          type,
          storyId: activeStoryId,
          roomId: room.id,
          side: edge.side,
          offset: clamp(snap(edge.offset - width / 2), 0.5, edgeLengthSafe(room, edge.side, width)),
          width,
          height,
          sill,
        },
      ],
    }))
    set({ selection: { kind: 'opening', id }, tool: 'select' })
  },
  placeAsset: (x, z) => {
    const { placingCatalogId, activeStoryId } = get()
    if (!placingCatalogId || !activeStoryId) return
    const id = uid('asset')
    get().updateActive((property) => ({
      ...property,
      assets: [
        ...property.assets,
        {
          id,
          catalogId: placingCatalogId,
          storyId: activeStoryId,
          x: snap(x, 0.25),
          z: snap(z, 0.25),
          rotation: 0,
          scale: 1,
        },
      ],
    }))
    set({ selection: { kind: 'asset', id }, tool: 'select', placingCatalogId: null })
  },
  moveAsset: (id, x, z, record = true) => {
    get().updateActive(
      (property) => ({
        ...property,
        assets: property.assets.map((asset) =>
          asset.id === id ? { ...asset, x: snap(x, 0.25), z: snap(z, 0.25) } : asset,
        ),
      }),
      record,
    )
  },
  rotateAsset: (id, delta) => {
    get().updateActive((property) => ({
      ...property,
      assets: property.assets.map((asset) =>
        asset.id === id ? { ...asset, rotation: (asset.rotation + delta + 360) % 360 } : asset,
      ),
    }))
  },
  updateAsset: (id, patch) => {
    get().updateActive((property) => ({
      ...property,
      assets: property.assets.map((asset) => (asset.id === id ? { ...asset, ...patch } : asset)),
    }))
  },
  applyRoof: (style) => {
    get().updateActive((property) => ({
      ...property,
      roof: { ...property.roof, style },
    }))
  },
  updateListing: (patch) => {
    get().updateActive((property) => ({
      ...property,
      listing: { ...property.listing, ...patch },
    }))
  },
  updateMeta: (patch) => {
    get().updateActive((property) => ({ ...property, ...patch }))
  },
  updateRoof: (patch) => {
    get().updateActive((property) => ({
      ...property,
      roof: { ...property.roof, ...patch },
    }))
  },
  undo: () => {
    const { past, projects, activeId, future } = get()
    const current = projects.find((project) => project.id === activeId)
    const previous = past[past.length - 1]
    if (!current || !previous) return
    set({
      projects: replaceActive(projects, activeId, previous),
      past: past.slice(0, -1),
      future: [current, ...future],
    })
  },
  redo: () => {
    const { future, projects, activeId, past } = get()
    const current = projects.find((project) => project.id === activeId)
    const next = future[0]
    if (!current || !next) return
    set({
      projects: replaceActive(projects, activeId, next),
      past: [...past, current],
      future: future.slice(1),
    })
  },
}))

function edgeLengthSafe(
  room: { width: number; depth: number },
  side: 'n' | 's' | 'e' | 'w',
  width: number,
): number {
  const length = side === 'n' || side === 's' ? room.width : room.depth
  return Math.max(0, length - width - 0.5)
}

export function activeProperty(): Property | undefined {
  const state = useStudio.getState()
  return state.projects.find((project) => project.id === state.activeId)
}
