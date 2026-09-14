import { Area, Building, Wing, Flat, Subscription } from '../types';
import { DatabaseState } from '../data/dummyGenerator';
import { parseCsv, buildCsv } from './csv';

export const IMPORT_HEADERS = ['Area', 'Building', 'Wing', 'FlatNumber', 'CustomerName', 'Phone', 'Papers'];

export interface ImportRow {
  lineNumber: number;
  area: string;
  building: string;
  wing: string;
  flatNumber: string;
  customerName: string;
  phone: string;
  papers: string[];
  errors: string[];
}

export interface ImportPreview {
  headerError?: string;
  rows: ImportRow[];
  validRows: ImportRow[];
  newAreas: string[];
  newBuildings: string[];
  newWings: string[];
}

export function buildImportTemplate(): string {
  // Deliberately unlikely to collide with real (or the app's seeded demo) Area/Building/Wing
  // names or flat numbers, so a first-time user can safely try an import without a spurious
  // "flat already exists" error against their existing data.
  return buildCsv(IMPORT_HEADERS, [
    ['Sample Colony', 'Demo Building', 'Wing X', 'S-101', 'Anand Sharma', '+91 9876543210', 'The Times of India;The Hindu'],
    ['Sample Colony', 'Demo Building', 'Wing X', 'S-102', 'Priya Nair', '+91 9876500011', 'The Times of India']
  ]);
}

const norm = (value: string) => value.trim().toLowerCase();

// Validates a customer CSV against current state without mutating anything, so the import
// modal can show exactly what will be created (and what is wrong) before the user commits.
export function parseCustomerCsv(text: string, state: DatabaseState): ImportPreview {
  const grid = parseCsv(text);

  if (grid.length === 0) {
    return { headerError: 'The file is empty.', rows: [], validRows: [], newAreas: [], newBuildings: [], newWings: [] };
  }

  const header = grid[0].map(h => norm(h));
  const expected = IMPORT_HEADERS.map(h => norm(h));
  if (expected.some((h, i) => header[i] !== h)) {
    return {
      headerError: `Header row must be exactly: ${IMPORT_HEADERS.join(', ')}`,
      rows: [], validRows: [], newAreas: [], newBuildings: [], newWings: []
    };
  }

  const paperNames = new Set(state.papers.map(p => norm(p.name)));
  // Tracks hierarchy that will exist after the import, so rows later in the file can reference
  // an area/building/wing introduced by an earlier row without being flagged as new twice.
  const knownAreas = new Set(state.areas.map(a => norm(a.name)));
  const knownBuildings = new Set(state.buildings.map(b => norm(b.name)));
  const knownWings = new Set(
    state.wings.map(w => {
      const building = state.buildings.find(b => b.id === w.buildingId);
      return `${norm(building?.name || '')}|${norm(w.name)}`;
    })
  );
  // Existing flats, keyed by building+wing+flat number, to catch duplicates
  const existingFlats = new Set(
    state.flats.map(f => {
      const wing = state.wings.find(w => w.id === f.wingId);
      const building = wing ? state.buildings.find(b => b.id === wing.buildingId) : null;
      return `${norm(building?.name || '')}|${norm(wing?.name || '')}|${norm(f.flatNumber)}`;
    })
  );

  const newAreas: string[] = [];
  const newBuildings: string[] = [];
  const newWings: string[] = [];
  const rows: ImportRow[] = [];

  grid.slice(1).forEach((cells, idx) => {
    const [area = '', building = '', wing = '', flatNumber = '', customerName = '', phone = '', papersRaw = ''] =
      cells.map(c => c.trim());

    const papers = papersRaw.split(';').map(p => p.trim()).filter(Boolean);
    const errors: string[] = [];

    if (!area) errors.push('Area is required');
    if (!building) errors.push('Building is required');
    if (!wing) errors.push('Wing is required');
    if (!flatNumber) errors.push('Flat number is required');
    if (!customerName) errors.push('Customer name is required');
    if (!phone) errors.push('Phone is required');
    if (papers.length === 0) errors.push('At least one paper is required');

    papers.forEach(p => {
      if (!paperNames.has(norm(p))) errors.push(`Unknown paper "${p}" - add it under Paper Masters first`);
    });

    const flatKey = `${norm(building)}|${norm(wing)}|${norm(flatNumber)}`;
    if (errors.length === 0 && existingFlats.has(flatKey)) {
      errors.push(`Flat ${flatNumber} already exists in ${building} ${wing}`);
    }

    const row: ImportRow = {
      lineNumber: idx + 2, // +1 for the header, +1 for 1-based line numbers
      area, building, wing, flatNumber, customerName, phone, papers, errors
    };
    rows.push(row);

    if (errors.length > 0) return;

    existingFlats.add(flatKey);
    if (!knownAreas.has(norm(area))) {
      knownAreas.add(norm(area));
      newAreas.push(area);
    }
    if (!knownBuildings.has(norm(building))) {
      knownBuildings.add(norm(building));
      newBuildings.push(building);
    }
    const wingKey = `${norm(building)}|${norm(wing)}`;
    if (!knownWings.has(wingKey)) {
      knownWings.add(wingKey);
      newWings.push(`${building} ➔ ${wing}`);
    }
  });

  return {
    rows,
    validRows: rows.filter(r => r.errors.length === 0),
    newAreas,
    newBuildings,
    newWings
  };
}

// Applies validated rows onto state, reusing any Area/Building/Wing that already matches by
// name (case-insensitively) and creating the rest.
export function applyCustomerImport(rows: ImportRow[], state: DatabaseState): DatabaseState {
  const areas: Area[] = [...state.areas];
  const buildings: Building[] = [...state.buildings];
  const wings: Wing[] = [...state.wings];
  const flats: Flat[] = [...state.flats];
  const subscriptions: Subscription[] = [...state.subscriptions];

  const stamp = Date.now();
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}_${stamp}_${seq++}`;

  rows.forEach((row) => {
    let area = areas.find(a => norm(a.name) === norm(row.area));
    if (!area) {
      area = { id: nextId('area'), name: row.area };
      areas.push(area);
    }

    let building = buildings.find(b => b.areaId === area!.id && norm(b.name) === norm(row.building));
    if (!building) {
      building = { id: nextId('b'), areaId: area.id, name: row.building };
      buildings.push(building);
    }

    let wing = wings.find(w => w.buildingId === building!.id && norm(w.name) === norm(row.wing));
    if (!wing) {
      wing = { id: nextId('w'), buildingId: building.id, name: row.wing };
      wings.push(wing);
    }

    const flat: Flat = {
      id: nextId('f'),
      wingId: wing.id,
      flatNumber: row.flatNumber,
      customerName: row.customerName,
      phoneNumber: row.phone,
      activeYear: new Date().getFullYear(),
      ledgerType: 'SUBSCRIPTION'
    };
    flats.push(flat);

    row.papers.forEach((paperName) => {
      const paper = state.papers.find(p => norm(p.name) === norm(paperName));
      if (!paper) return;
      subscriptions.push({
        id: nextId('sub'),
        flatId: flat.id,
        paperId: paper.id,
        active: true,
        status: 'ACTIVE'
      });
    });
  });

  return { ...state, areas, buildings, wings, flats, subscriptions };
}
