import { finishedArea, formatArea, formatMoney } from '../measurements'
import { useStudio } from '../store'
import { PlanThumbnail } from './PlanThumbnail'

export function Library() {
  const { projects, openProject, newProject, duplicateProject, deleteProject, resetSamples, setScreen, importProject } = useStudio()

  return (
    <div className="library-page">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden />
          <div>
            <strong>Molten Magnolia</strong>
            <small>Listing inventory</small>
          </div>
        </div>
        <nav>
          <button type="button" className="ghost" onClick={() => setScreen('landing')}>
            Overview
          </button>
          <button type="button" className="ghost" onClick={resetSamples}>
            Restore sample homes
          </button>
          <label className="ghost file-btn">
            Import JSON
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const parsed = JSON.parse(await file.text())
                importProject(parsed)
              }}
            />
          </label>
          <button type="button" className="primary" onClick={newProject}>
            New listing
          </button>
        </nav>
      </header>
      <section className="library-grid">
        {projects.map((project) => (
          <article key={project.id} className="listing-card">
            <button type="button" className="thumb-btn" onClick={() => openProject(project.id)}>
              <PlanThumbnail property={project} />
            </button>
            <div className="card-body">
              <p className="eyebrow">{project.listing.status}</p>
              <h2>{project.name}</h2>
              <p>
                {project.address}
                {project.city ? ` · ${project.city}` : ''}
              </p>
              <p className="stat">
                {project.listing.price ? formatMoney(project.listing.price) : 'Unpriced'} · {project.stories.length}{' '}
                {project.stories.length === 1 ? 'story' : 'stories'} · {formatArea(finishedArea(project))}
              </p>
              <div className="card-actions">
                <button type="button" className="primary" onClick={() => openProject(project.id)}>
                  Open studio
                </button>
                <button type="button" className="ghost" onClick={() => duplicateProject(project.id)}>
                  Duplicate
                </button>
                <button type="button" className="ghost danger" onClick={() => deleteProject(project.id)}>
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
