import { useEffect, useMemo, useState } from 'react'
import { finishedArea, formatArea, storyArea } from '../measurements'
import { useStudio } from '../store'
import type { Property, Tool, ViewMode } from '../types'
import { AssetLibrary } from './AssetLibrary'
import { ExportDrawer } from './ExportDrawer'
import { FloorPlan } from './FloorPlan'
import { Inspector } from './Inspector'
import { ListingSheet } from './ListingSheet'
import { Viewport3D } from './Viewport3D'

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'room', label: 'Room' },
  { id: 'door', label: 'Door' },
  { id: 'window', label: 'Window' },
  { id: 'opening', label: 'Opening' },
  { id: 'erase', label: 'Erase' },
]

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'plan', label: 'Floor plate' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'dollhouse', label: 'Dollhouse' },
  { id: 'walk', label: 'Walk' },
  { id: 'print', label: 'Print preview' },
]

export function Studio({ property }: { property: Property }) {
  const {
    tool,
    setTool,
    viewMode,
    setViewMode,
    activeStoryId,
    setStory,
    addStory,
    removeStory,
    setScreen,
    undo,
    redo,
    deleteSelected,
    past,
    future,
  } = useStudio()
  const [deliver, setDeliver] = useState(false)
  const area = useMemo(() => finishedArea(property), [property])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      }
      if (event.key === 'Delete' || event.key === 'Backspace') deleteSelected()
      if (event.key === 'Escape') setTool('select')
      if (event.key === '1') setViewMode('plan')
      if (event.key === '2') setViewMode('orbit')
      if (event.key === '3') setViewMode('dollhouse')
      if (event.key === '4') setViewMode('walk')
      if (event.key === '5') setViewMode('print')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteSelected, redo, setTool, setViewMode, undo])

  return (
    <div className="studio">
      <header className="topbar studio-bar">
        <div className="brand compact">
          <span className="mark" aria-hidden />
          <div>
            <strong>{property.name}</strong>
            <small>
              {property.address || 'Unaddressed lot'} · {formatArea(area)}
            </small>
          </div>
        </div>
        <div className="view-switch" role="tablist">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              className={viewMode === view.id ? 'on' : ''}
              onClick={() => setViewMode(view.id)}
            >
              {view.label}
            </button>
          ))}
        </div>
        <nav>
          <button type="button" className="ghost" onClick={undo} disabled={past.length === 0}>
            Undo
          </button>
          <button type="button" className="ghost" onClick={redo} disabled={future.length === 0}>
            Redo
          </button>
          <button type="button" className="ghost" onClick={() => setScreen('library')}>
            Inventory
          </button>
          <button type="button" className="primary" onClick={() => setDeliver((value) => !value)}>
            {deliver ? 'Hide crate' : 'Crate & print'}
          </button>
        </nav>
      </header>
      <div className="studio-body">
        <div className="left-col">
          <section className="story-rail">
            <p className="eyebrow">Stories</p>
            {property.stories.map((story) => (
              <button
                key={story.id}
                type="button"
                className={story.id === activeStoryId ? 'story on' : 'story'}
                onClick={() => setStory(story.id)}
              >
                <strong>{story.name}</strong>
                <span>{formatArea(storyArea(property, story.id))}</span>
              </button>
            ))}
            <div className="story-actions">
              <button type="button" className="ghost" onClick={addStory}>
                Add story
              </button>
              {activeStoryId && property.stories.length > 1 ? (
                <button type="button" className="ghost danger" onClick={() => removeStory(activeStoryId)}>
                  Remove
                </button>
              ) : null}
            </div>
          </section>
          <AssetLibrary />
        </div>
        <main className="stage">
          <div className="tools">
            {TOOLS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={tool === entry.id ? 'on' : ''}
                onClick={() => setTool(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {viewMode === 'plan' ? <FloorPlan property={property} /> : <Viewport3D property={property} />}
        </main>
        <div className="right-col">
          <Inspector property={property} />
          {deliver ? <ExportDrawer property={property} /> : null}
        </div>
      </div>
      <ListingSheet property={property} />
    </div>
  )
}
