import { CATEGORIES, ROOF_STYLES, searchCatalog } from '../catalog'
import { useStudio } from '../store'

export function AssetLibrary() {
  const { category, query, setCategory, setQuery, setPlacing, placingCatalogId, applyRoof, tool } = useStudio()
  const items = searchCatalog(query).filter((item) => (query.trim() ? true : item.category === category))

  return (
    <aside className="library-panel">
      <div className="panel-head">
        <p className="eyebrow">Studio library</p>
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search furniture, roofs, plants…"
        />
      </div>
      <div className="chips">
        {CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            className={category === entry.id && !query ? 'chip on' : 'chip'}
            onClick={() => {
              setQuery('')
              setCategory(entry.id)
            }}
            type="button"
          >
            {entry.label}
          </button>
        ))}
      </div>
      {category === 'roof' && !query ? (
        <div className="asset-list">
          {ROOF_STYLES.map((roof) => (
            <button key={roof.id} className="asset-card" type="button" onClick={() => applyRoof(roof.id)}>
              <span className="swatch roof" data-style={roof.id} />
              <span>
                <strong>{roof.name}</strong>
                <em>{roof.description}</em>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="asset-list">
          {items.map((item) => (
            <button
              key={item.id}
              className={placingCatalogId === item.id && tool === 'place' ? 'asset-card on' : 'asset-card'}
              type="button"
              onClick={() => setPlacing(item.id)}
            >
              <span className="swatch" style={{ background: item.color, boxShadow: `inset 0 -10px 0 ${item.accent}` }} />
              <span>
                <strong>{item.name}</strong>
                <em>
                  {item.width}′ × {item.depth}′ · {item.description}
                </em>
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
