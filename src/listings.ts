import { uid } from './ids'
import type { Opening, PlacedAsset, Property, Room, Story } from './types'

function story(name: string, height = 9, slab = 0.8): Story {
  return { id: uid('story'), name, height, slab }
}

function room(
  storyId: string,
  name: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  wallColor: string,
  floorColor: string,
): Room {
  return { id: uid('room'), storyId, name, x, z, width, depth, wallColor, floorColor }
}

function opening(
  storyId: string,
  roomId: string,
  type: Opening['type'],
  side: Opening['side'],
  offset: number,
  width: number,
  height: number,
  sill = 0,
): Opening {
  return { id: uid('open'), type, storyId, roomId, side, offset, width, height, sill }
}

function asset(
  catalogId: string,
  storyId: string,
  x: number,
  z: number,
  rotation = 0,
): PlacedAsset {
  return { id: uid('asset'), catalogId, storyId, x, z, rotation, scale: 1 }
}

function stamp(property: Omit<Property, 'id' | 'updatedAt'>): Property {
  return { ...property, id: uid('home'), updatedAt: Date.now() }
}

export function emptyProperty(name = 'Untitled listing'): Property {
  const first = story('First floor')
  return stamp({
    name,
    address: '',
    city: '',
    lotWidth: 80,
    lotDepth: 110,
    stories: [first],
    rooms: [],
    openings: [],
    assets: [],
    roof: { style: 'gable', pitch: 0.45, overhang: 1.5, color: '#6b3a28' },
    listing: {
      price: 0,
      beds: 0,
      baths: 0,
      realtor: '',
      brokerage: 'Molten Magnolia',
      summary: '',
      status: 'draft',
    },
  })
}

export function magnoliaCottage(): Property {
  const first = story('Main level', 9)
  const porch = room(first.id, 'Porch', 18, 8, 22, 7, '#f3e6d8', '#d8c3a5')
  const living = room(first.id, 'Living', 18, 15, 18, 16, '#f6efe4', '#c4a882')
  const dining = room(first.id, 'Dining', 36, 15, 14, 12, '#f6efe4', '#c4a882')
  const kitchen = room(first.id, 'Kitchen', 36, 27, 14, 12, '#efe4d4', '#b08960')
  const hall = room(first.id, 'Hall', 18, 31, 18, 8, '#f6efe4', '#c4a882')
  const primary = room(first.id, 'Primary bedroom', 4, 15, 14, 16, '#efe8df', '#c4a882')
  const bath = room(first.id, 'Bath', 4, 31, 8, 8, '#e8e4dc', '#d5d0c6')
  const guest = room(first.id, 'Guest bedroom', 12, 31, 6, 12, '#efe8df', '#c4a882')
  const guestWide = room(first.id, 'Studio bedroom', 36, 39, 14, 12, '#efe8df', '#c4a882')

  return stamp({
    name: 'Magnolia Cottage',
    address: '14 Petal Lane',
    city: 'Aiken, SC',
    lotWidth: 70,
    lotDepth: 90,
    stories: [first],
    rooms: [porch, living, dining, kitchen, hall, primary, bath, guest, guestWide],
    openings: [
      opening(first.id, porch.id, 'door', 's', 8, 6, 8),
      opening(first.id, living.id, 'door', 'n', 6, 3.2, 7),
      opening(first.id, living.id, 'window', 's', 4, 5, 4.5, 2.6),
      opening(first.id, living.id, 'window', 'w', 4, 4, 4.5, 2.6),
      opening(first.id, dining.id, 'window', 'n', 4, 5, 4.5, 2.6),
      opening(first.id, dining.id, 'opening', 'w', 4, 5, 7.5),
      opening(first.id, kitchen.id, 'opening', 'n', 4, 6, 7.5),
      opening(first.id, kitchen.id, 'window', 'e', 3, 4, 3.5, 3.2),
      opening(first.id, hall.id, 'opening', 'n', 6, 4, 7.5),
      opening(first.id, primary.id, 'door', 'e', 6, 3, 7),
      opening(first.id, primary.id, 'window', 'w', 5, 4.5, 4.5, 2.6),
      opening(first.id, bath.id, 'door', 'e', 2, 2.6, 7),
      opening(first.id, guest.id, 'door', 'n', 1.5, 2.8, 7),
      opening(first.id, guestWide.id, 'door', 'n', 5, 2.8, 7),
      opening(first.id, guestWide.id, 'window', 's', 4, 4, 4.5, 2.6),
    ],
    assets: [
      asset('sofa-chesterfield', first.id, 27, 26, 180),
      asset('armchair-club', first.id, 21, 22, 90),
      asset('coffee-walnut', first.id, 27, 22),
      asset('rug-wool', first.id, 27, 23),
      asset('fireplace', first.id, 20.2, 23, 90),
      asset('dining-harvest', first.id, 43, 21),
      asset('dining-chair', first.id, 43, 18.6),
      asset('dining-chair', first.id, 43, 23.4, 180),
      asset('chandelier', first.id, 43, 21),
      asset('island-butcher', first.id, 43, 33),
      asset('bar-stool', first.id, 40, 33, 90),
      asset('range-gas', first.id, 48.4, 29.2),
      asset('fridge-panel', first.id, 38, 29.4),
      asset('sink-apron', first.id, 43, 37.8, 180),
      asset('bed-primary', first.id, 11, 23),
      asset('nightstand', first.id, 7, 20),
      asset('nightstand', first.id, 15, 20),
      asset('dresser-wide', first.id, 11, 29.6, 180),
      asset('vanity-powder', first.id, 8, 36.8, 180),
      asset('toilet', first.id, 6, 33.4, 90),
      asset('bed-guest', first.id, 43, 45),
      asset('plant-fiddle', first.id, 34, 17),
      asset('tree-magnolia', first.id, 10, 8),
      asset('bench-porch', first.id, 29, 11.4),
      asset('planter', first.id, 20, 10),
    ],
    roof: { style: 'gable', pitch: 0.5, overhang: 1.6, color: '#6b3a28' },
    listing: {
      price: 489000,
      beds: 3,
      baths: 1,
      realtor: 'Clara Voss',
      brokerage: 'Molten Magnolia Realty',
      summary:
        'A one-story cottage with a deep porch, a hearth-centered living room, and a kitchen that opens to dining. Built as a print-ready listing model.',
      status: 'ready',
    },
  })
}

export function copperHillColonial(): Property {
  const first = story('First floor', 9.5)
  const second = story('Second floor', 9)
  const foyer = room(first.id, 'Foyer', 28, 8, 10, 10, '#f6efe4', '#c4a882')
  const living = room(first.id, 'Living room', 8, 8, 20, 18, '#f3e6d8', '#c4a882')
  const dining = room(first.id, 'Dining room', 38, 8, 18, 14, '#f6efe4', '#c4a882')
  const kitchen = room(first.id, 'Kitchen', 38, 22, 18, 16, '#efe4d4', '#b08960')
  const office = room(first.id, 'Study', 8, 26, 12, 12, '#efe8df', '#c4a882')
  const powder = room(first.id, 'Powder', 20, 26, 8, 8, '#e8e4dc', '#d5d0c6')
  const mud = room(first.id, 'Mudroom', 20, 34, 8, 4, '#efe4d4', '#b08960')
  const landing = room(second.id, 'Landing', 28, 16, 10, 12, '#f6efe4', '#c4a882')
  const primary = room(second.id, 'Primary suite', 8, 8, 20, 20, '#efe8df', '#c4a882')
  const bathP = room(second.id, 'Primary bath', 8, 28, 12, 12, '#e8e4dc', '#d5d0c6')
  const bed2 = room(second.id, 'Bedroom two', 38, 8, 18, 14, '#efe8df', '#c4a882')
  const bed3 = room(second.id, 'Bedroom three', 38, 22, 18, 14, '#efe8df', '#c4a882')
  const bathH = room(second.id, 'Hall bath', 28, 28, 10, 12, '#e8e4dc', '#d5d0c6')

  return stamp({
    name: 'Copper Hill Colonial',
    address: '220 Foundry Road',
    city: 'Greenville, SC',
    lotWidth: 90,
    lotDepth: 120,
    stories: [first, second],
    rooms: [
      foyer,
      living,
      dining,
      kitchen,
      office,
      powder,
      mud,
      landing,
      primary,
      bathP,
      bed2,
      bed3,
      bathH,
    ],
    openings: [
      opening(first.id, foyer.id, 'door', 'n', 3, 4, 8),
      opening(first.id, living.id, 'opening', 'e', 6, 5, 7.5),
      opening(first.id, living.id, 'window', 'w', 5, 5, 5, 2.4),
      opening(first.id, dining.id, 'opening', 'w', 4, 4, 7.5),
      opening(first.id, dining.id, 'window', 'e', 4, 5, 5, 2.4),
      opening(first.id, kitchen.id, 'opening', 'n', 6, 6, 7.5),
      opening(first.id, kitchen.id, 'window', 's', 6, 5, 3.6, 3.2),
      opening(first.id, office.id, 'door', 'e', 4, 3, 7),
      opening(first.id, powder.id, 'door', 'n', 2.5, 2.6, 7),
      opening(second.id, landing.id, 'opening', 'w', 3, 3.4, 7.5),
      opening(second.id, primary.id, 'door', 'e', 8, 3, 7),
      opening(second.id, primary.id, 'window', 'w', 6, 5, 5, 2.4),
      opening(second.id, bathP.id, 'door', 'n', 4, 2.8, 7),
      opening(second.id, bed2.id, 'door', 'w', 5, 2.8, 7),
      opening(second.id, bed3.id, 'door', 'w', 5, 2.8, 7),
      opening(second.id, bathH.id, 'door', 'n', 3, 2.6, 7),
    ],
    assets: [
      asset('sofa-midcentury', first.id, 16, 20, 180),
      asset('loveseat-linen', first.id, 12, 14, 90),
      asset('coffee-walnut', first.id, 18, 16),
      asset('rug-wool', first.id, 18, 17),
      asset('fireplace', first.id, 9.2, 17, 90),
      asset('dining-harvest', first.id, 47, 15),
      asset('dining-chair', first.id, 47, 12.8),
      asset('dining-chair', first.id, 47, 17.2, 180),
      asset('chandelier', first.id, 47, 15),
      asset('island-butcher', first.id, 47, 30),
      asset('range-gas', first.id, 54.4, 24.4),
      asset('fridge-panel', first.id, 40, 24.4),
      asset('desk-writing', first.id, 14, 32),
      asset('office-chair', first.id, 14, 34.2, 180),
      asset('bookshelf', first.id, 9.7, 32, 90),
      asset('vanity-powder', first.id, 24, 32.6, 180),
      asset('toilet', first.id, 22, 28.4),
      asset('stairs-flight', first.id, 33, 20),
      asset('bed-primary', second.id, 16, 18),
      asset('nightstand', second.id, 12, 15),
      asset('nightstand', second.id, 20, 15),
      asset('dresser-wide', second.id, 18, 26.6, 180),
      asset('tub-soaking', second.id, 14, 34),
      asset('vanity-double', second.id, 14, 38.6, 180),
      asset('bed-guest', second.id, 47, 15),
      asset('bed-guest', second.id, 47, 29),
      asset('vanity-powder', second.id, 33, 38.2, 180),
      asset('toilet', second.id, 30, 30.4),
      asset('shower-glass', second.id, 33, 32),
      asset('plant-olive', first.id, 30, 10),
      asset('tree-magnolia', first.id, 4, 4),
      asset('tree-crepe', first.id, 62, 6),
      asset('car-sedan', first.id, 68, 30, 90),
    ],
    roof: { style: 'hip', pitch: 0.42, overhang: 1.4, color: '#5a3326' },
    listing: {
      price: 875000,
      beds: 4,
      baths: 3,
      realtor: 'Jonah Hale',
      brokerage: 'Molten Magnolia Realty',
      summary:
        'A two-story colonial with a formal dining room, a hearth living room, and a stacked bedroom floor. Ready as a realtor walkthrough and a printable dollhouse.',
      status: 'ready',
    },
  })
}

export function foundryTownhouse(): Property {
  const garage = story('Garden level', 9)
  const main = story('Main living', 9.5)
  const sleep = story('Sleeping floor', 9)
  const garageRoom = room(garage.id, 'Garage', 8, 10, 22, 22, '#d8d2c8', '#8a8f86')
  const entry = room(garage.id, 'Entry', 30, 10, 10, 12, '#f6efe4', '#c4a882')
  const powder = room(garage.id, 'Powder', 30, 22, 10, 10, '#e8e4dc', '#d5d0c6')
  const living = room(main.id, 'Living', 8, 10, 20, 16, '#f3e6d8', '#c4a882')
  const dining = room(main.id, 'Dining', 28, 10, 12, 16, '#f6efe4', '#c4a882')
  const kitchen = room(main.id, 'Kitchen', 8, 26, 32, 12, '#efe4d4', '#b08960')
  const deck = room(main.id, 'Deck', 8, 38, 32, 8, '#efe4d4', '#8a6a4a')
  const primary = room(sleep.id, 'Primary bedroom', 8, 10, 20, 18, '#efe8df', '#c4a882')
  const bath = room(sleep.id, 'Bath', 28, 10, 12, 12, '#e8e4dc', '#d5d0c6')
  const guest = room(sleep.id, 'Guest bedroom', 8, 28, 20, 14, '#efe8df', '#c4a882')
  const laundry = room(sleep.id, 'Laundry', 28, 22, 12, 8, '#efe4d4', '#d5d0c6')

  return stamp({
    name: 'Foundry Townhouse',
    address: '8 Slag Alley',
    city: 'Chattanooga, TN',
    lotWidth: 50,
    lotDepth: 70,
    stories: [garage, main, sleep],
    rooms: [
      garageRoom,
      entry,
      powder,
      living,
      dining,
      kitchen,
      deck,
      primary,
      bath,
      guest,
      laundry,
    ],
    openings: [
      opening(garage.id, garageRoom.id, 'door', 'n', 8, 8, 8),
      opening(garage.id, entry.id, 'door', 'n', 3, 3.2, 8),
      opening(garage.id, entry.id, 'opening', 'w', 3, 3, 7.5),
      opening(garage.id, powder.id, 'door', 'n', 3.5, 2.6, 7),
      opening(main.id, living.id, 'opening', 'e', 5, 6, 7.5),
      opening(main.id, living.id, 'window', 'w', 4, 5, 5, 2.4),
      opening(main.id, dining.id, 'window', 'e', 4, 5, 5, 2.4),
      opening(main.id, kitchen.id, 'opening', 'n', 8, 8, 7.5),
      opening(main.id, deck.id, 'door', 'n', 12, 6, 7.5),
      opening(sleep.id, primary.id, 'door', 'e', 7, 3, 7),
      opening(sleep.id, bath.id, 'door', 'w', 4, 2.8, 7),
      opening(sleep.id, guest.id, 'door', 'e', 5, 2.8, 7),
      opening(sleep.id, laundry.id, 'door', 'w', 2, 2.6, 7),
    ],
    assets: [
      asset('car-sedan', garage.id, 19, 21),
      asset('washer', garage.id, 33, 24),
      asset('console-entry', garage.id, 35, 13),
      asset('vanity-powder', garage.id, 35, 30.6, 180),
      asset('toilet', garage.id, 32, 24.4),
      asset('stairs-flight', garage.id, 35, 16),
      asset('sofa-chesterfield', main.id, 16, 21, 180),
      asset('coffee-walnut', main.id, 18, 17),
      asset('tv-console', main.id, 18, 11.1),
      asset('dining-round', main.id, 34, 18),
      asset('dining-chair', main.id, 34, 15.8),
      asset('island-butcher', main.id, 24, 32),
      asset('range-gas', main.id, 11.6, 28.4, 90),
      asset('fridge-panel', main.id, 37.4, 28.4, 90),
      asset('outdoor-table', main.id, 24, 42),
      asset('grill', main.id, 36, 41),
      asset('railing', main.id, 24, 45.7),
      asset('bed-primary', sleep.id, 16, 19),
      asset('wardrobe', sleep.id, 10.2, 14, 90),
      asset('vanity-double', sleep.id, 34, 14),
      asset('tub-soaking', sleep.id, 34, 20),
      asset('bed-guest', sleep.id, 16, 35),
      asset('washer', sleep.id, 31, 26),
      asset('dryer', sleep.id, 34, 26),
      asset('tree-crepe', garage.id, 4, 6),
      asset('planter', garage.id, 42, 8),
    ],
    roof: { style: 'shed', pitch: 0.28, overhang: 1.1, color: '#4a332c' },
    listing: {
      price: 642000,
      beds: 2,
      baths: 2,
      realtor: 'Nia Pell',
      brokerage: 'Molten Magnolia Realty',
      summary:
        'A three-story townhouse with a garden-level garage, a single-span living floor, and stacked bedrooms. Designed so each story prints as its own plate.',
      status: 'staged',
    },
  })
}

export function seedListings(): Property[] {
  return [magnoliaCottage(), copperHillColonial(), foundryTownhouse()]
}
