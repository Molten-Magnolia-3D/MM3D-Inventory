import { downloadBuffer, downloadText, exportPropertyStl, propertyToJson } from '../exportStl'
import { feetToPrintMm, finishedArea, formatArea, formatMoney, printScaleLabel } from '../measurements'
import { slug } from '../persistence'
import { useStudio } from '../store'
import type { Property } from '../types'

export function ExportDrawer({ property }: { property: Property }) {
  const { print, setPrint } = useStudio()
  const boxW = feetToPrintMm(property.lotWidth, print.scale)
  const boxD = feetToPrintMm(property.lotDepth, print.scale)

  function exportStl() {
    const buffer = exportPropertyStl(property, print)
    downloadBuffer(`${slug(property.name)}.stl`, buffer, 'model/stl')
  }

  function exportJson() {
    downloadText(`${slug(property.name)}.json`, propertyToJson(property))
  }

  function printSheet() {
    window.print()
  }

  return (
    <section className="export-drawer">
      <p className="eyebrow">Deliverables</p>
      <h3>Realtor package</h3>
      <p className="muted">
        {formatMoney(property.listing.price)} · {property.listing.beds} bd / {property.listing.baths} ba ·{' '}
        {formatArea(finishedArea(property))}
      </p>
      <button type="button" className="primary" onClick={printSheet}>
        Print listing sheet
      </button>
      <button type="button" className="ghost" onClick={exportJson}>
        Download project JSON
      </button>
      <h3>Foundry print</h3>
      <label>
        Scale
        <select value={print.scale} onChange={(event) => setPrint({ scale: Number(event.target.value) })}>
          {[100, 150, 200, 250, 300, 500].map((scale) => (
            <option key={scale} value={scale}>
              {printScaleLabel(scale)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Minimum wall
        <input
          type="number"
          step={0.1}
          value={print.minWallMm}
          onChange={(event) => setPrint({ minWallMm: Number(event.target.value) })}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={print.includeRoof}
          onChange={(event) => setPrint({ includeRoof: event.target.checked })}
        />
        Include roof
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={print.includeFurniture}
          onChange={(event) => setPrint({ includeFurniture: event.target.checked })}
        />
        Include furniture blocks
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={print.separateStories}
          onChange={(event) => setPrint({ separateStories: event.target.checked })}
        />
        Gap stories for plate separation
      </label>
      <p className="stat">
        Build plate about {boxW.toFixed(0)} × {boxD.toFixed(0)} mm at {printScaleLabel(print.scale)}
      </p>
      <button type="button" className="primary" onClick={exportStl}>
        Export printable STL
      </button>
    </section>
  )
}
