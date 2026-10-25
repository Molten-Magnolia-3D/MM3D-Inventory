import { finishedArea, formatArea, formatMoney, storyArea } from '../measurements'
import type { Property } from '../types'
import { PlanThumbnail } from './PlanThumbnail'

export function ListingSheet({ property }: { property: Property }) {
  return (
    <article className="listing-sheet" id="listing-sheet">
      <header>
        <p className="eyebrow">Molten Magnolia · Homestead</p>
        <h2>{property.name}</h2>
        <p>
          {property.address}
          {property.city ? ` · ${property.city}` : ''}
        </p>
      </header>
      <div className="sheet-grid">
        <PlanThumbnail property={property} />
        <dl>
          <div>
            <dt>Ask</dt>
            <dd>{property.listing.price ? formatMoney(property.listing.price) : 'Upon request'}</dd>
          </div>
          <div>
            <dt>Beds / baths</dt>
            <dd>
              {property.listing.beds} / {property.listing.baths}
            </dd>
          </div>
          <div>
            <dt>Finished area</dt>
            <dd>{formatArea(finishedArea(property))}</dd>
          </div>
          <div>
            <dt>Stories</dt>
            <dd>{property.stories.length}</dd>
          </div>
        </dl>
      </div>
      <p className="summary">{property.listing.summary}</p>
      <ul className="story-stats">
        {property.stories.map((story) => (
          <li key={story.id}>
            <strong>{story.name}</strong>
            <span>{formatArea(storyArea(property, story.id))}</span>
          </li>
        ))}
      </ul>
      <footer>
        <span>{property.listing.realtor || 'Listing agent'}</span>
        <span>{property.listing.brokerage}</span>
      </footer>
    </article>
  )
}
