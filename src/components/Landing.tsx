import { CATALOG, ROOF_STYLES } from '../catalog'
import { seedListings } from '../listings'
import { useStudio } from '../store'

export function Landing() {
  const { setScreen, openProject, newProject, projects } = useStudio()
  const featured = projects[0] ?? seedListings()[0]

  return (
    <div className="landing">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden />
          <div>
            <strong>Molten Magnolia</strong>
            <small>Homestead Studio</small>
          </div>
        </div>
        <nav>
          <button type="button" className="ghost" onClick={() => setScreen('library')}>
            Listings
          </button>
          <button type="button" className="primary" onClick={newProject}>
            New floor plate
          </button>
        </nav>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">For realtors, from the foundry</p>
          <h1>Draw the floor. Raise the house. Hand them a model they can walk — or hold.</h1>
          <p className="lede">
            Homestead turns floor planes into multi-story 3D listings. Furnish from a studio library of roofs,
            rooms, and objects, then export a walkthrough for the listing and a printable shell for the press.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary" onClick={() => openProject(featured.id)}>
              Open {featured.name}
            </button>
            <button type="button" className="ghost" onClick={() => setScreen('library')}>
              Browse the inventory
            </button>
          </div>
        </div>
        <aside className="hero-card">
          <p className="eyebrow">What ships in the crate</p>
          <ul>
            <li>
              <strong>{CATALOG.length} staged objects</strong>
              <span>Furniture, baths, kitchens, landscape, and architectural pieces.</span>
            </li>
            <li>
              <strong>{ROOF_STYLES.length} roof families</strong>
              <span>Gable, hip, shed, flat, gambrel, and mansard — pitch and overhang live.</span>
            </li>
            <li>
              <strong>Stacked stories</strong>
              <span>Each floor is its own plate. Dollhouse view splits them for the buyer.</span>
            </li>
            <li>
              <strong>Printable STL</strong>
              <span>Scale the house to 1:150–1:500 with walls thickened for FDM.</span>
            </li>
          </ul>
        </aside>
      </section>
      <section className="steps">
        <article>
          <span>01</span>
          <h2>Trace the floor planes</h2>
          <p>Draw rooms on a foot grid. Walls, shared partitions, doors, and windows come from the plate.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Stack the stories</h2>
          <p>Add floors, stairs, and a roof. The same house can be a ranch, a colonial, or a townhouse.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Stage and deliver</h2>
          <p>Place the library, write the listing sheet, and export a 3D print for the open house table.</p>
        </article>
      </section>
    </div>
  )
}
