import { CATALOG_BY_ID, ROOF_STYLES } from '../catalog'
import { formatArea, formatFeet, roomArea } from '../measurements'
import { useStudio } from '../store'
import type { Property } from '../types'

export function Inspector({ property }: { property: Property }) {
  const {
    selection,
    updateRoom,
    updateAsset,
    updateMeta,
    updateListing,
    updateRoof,
    rotateAsset,
    resizeRoom,
    activeStoryId,
    renameStory,
  } = useStudio()
  const story = property.stories.find((entry) => entry.id === activeStoryId)
  const room = selection?.kind === 'room' ? property.rooms.find((entry) => entry.id === selection.id) : undefined
  const asset = selection?.kind === 'asset' ? property.assets.find((entry) => entry.id === selection.id) : undefined
  const opening = selection?.kind === 'opening' ? property.openings.find((entry) => entry.id === selection.id) : undefined
  const item = asset ? CATALOG_BY_ID[asset.catalogId] : undefined

  return (
    <aside className="inspector">
      <p className="eyebrow">Inspector</p>
      {room ? (
        <section>
          <h3>{room.name}</h3>
          <label>
            Room name
            <input value={room.name} onChange={(event) => updateRoom(room.id, { name: event.target.value })} />
          </label>
          <div className="pair">
            <label>
              Width
              <input
                type="number"
                step={0.5}
                value={room.width}
                onChange={(event) => resizeRoom(room.id, Number(event.target.value), room.depth)}
              />
            </label>
            <label>
              Depth
              <input
                type="number"
                step={0.5}
                value={room.depth}
                onChange={(event) => resizeRoom(room.id, room.width, Number(event.target.value))}
              />
            </label>
          </div>
          <p className="stat">{formatArea(roomArea(room))}</p>
          <label>
            Floor
            <input type="color" value={room.floorColor} onChange={(event) => updateRoom(room.id, { floorColor: event.target.value })} />
          </label>
        </section>
      ) : null}
      {asset && item ? (
        <section>
          <h3>{item.name}</h3>
          <p className="muted">{item.description}</p>
          <div className="pair">
            <label>
              Rotation
              <input
                type="number"
                step={15}
                value={asset.rotation}
                onChange={(event) => updateAsset(asset.id, { rotation: Number(event.target.value) })}
              />
            </label>
            <label>
              Scale
              <input
                type="number"
                step={0.05}
                min={0.4}
                max={2.5}
                value={asset.scale}
                onChange={(event) => updateAsset(asset.id, { scale: Number(event.target.value) })}
              />
            </label>
          </div>
          <button type="button" className="ghost" onClick={() => rotateAsset(asset.id, 15)}>
            Rotate 15°
          </button>
        </section>
      ) : null}
      {opening ? (
        <section>
          <h3>{opening.type}</h3>
          <p className="muted">
            {opening.width}′ wide · {opening.height}′ tall
            {opening.sill ? ` · ${opening.sill}′ sill` : ''}
          </p>
        </section>
      ) : null}
      {!room && !asset && !opening ? (
        <section>
          <h3>Listing</h3>
          <label>
            Home name
            <input value={property.name} onChange={(event) => updateMeta({ name: event.target.value })} />
          </label>
          <label>
            Street
            <input value={property.address} onChange={(event) => updateMeta({ address: event.target.value })} />
          </label>
          <label>
            City
            <input value={property.city} onChange={(event) => updateMeta({ city: event.target.value })} />
          </label>
          <div className="pair">
            <label>
              Price
              <input
                type="number"
                value={property.listing.price}
                onChange={(event) => updateListing({ price: Number(event.target.value) })}
              />
            </label>
            <label>
              Status
              <select
                value={property.listing.status}
                onChange={(event) => updateListing({ status: event.target.value as Property['listing']['status'] })}
              >
                <option value="draft">Draft</option>
                <option value="staged">Staged</option>
                <option value="ready">Ready</option>
              </select>
            </label>
          </div>
          <div className="pair">
            <label>
              Beds
              <input
                type="number"
                value={property.listing.beds}
                onChange={(event) => updateListing({ beds: Number(event.target.value) })}
              />
            </label>
            <label>
              Baths
              <input
                type="number"
                value={property.listing.baths}
                onChange={(event) => updateListing({ baths: Number(event.target.value) })}
              />
            </label>
          </div>
          <label>
            Realtor
            <input value={property.listing.realtor} onChange={(event) => updateListing({ realtor: event.target.value })} />
          </label>
          <label>
            Summary
            <textarea
              rows={4}
              value={property.listing.summary}
              onChange={(event) => updateListing({ summary: event.target.value })}
            />
          </label>
        </section>
      ) : null}
      <section>
        <h3>Roof</h3>
        <label>
          Style
          <select
            value={property.roof.style}
            onChange={(event) => updateRoof({ style: event.target.value as Property['roof']['style'] })}
          >
            {ROOF_STYLES.map((roof) => (
              <option key={roof.id} value={roof.id}>
                {roof.name}
              </option>
            ))}
          </select>
        </label>
        <div className="pair">
          <label>
            Pitch
            <input
              type="number"
              step={0.05}
              value={property.roof.pitch}
              onChange={(event) => updateRoof({ pitch: Number(event.target.value) })}
            />
          </label>
          <label>
            Overhang
            <input
              type="number"
              step={0.1}
              value={property.roof.overhang}
              onChange={(event) => updateRoof({ overhang: Number(event.target.value) })}
            />
          </label>
        </div>
        <label>
          Color
          <input type="color" value={property.roof.color} onChange={(event) => updateRoof({ color: event.target.value })} />
        </label>
      </section>
      {story ? (
        <section>
          <h3>{story.name}</h3>
          <label>
            Story name
            <input value={story.name} onChange={(event) => renameStory(story.id, event.target.value)} />
          </label>
          <p className="muted">Ceiling {formatFeet(story.height)} · slab {formatFeet(story.slab)}</p>
        </section>
      ) : null}
    </aside>
  )
}
