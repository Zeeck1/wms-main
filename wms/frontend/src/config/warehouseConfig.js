/**
 * Warehouse Layout Configuration
 * 
 * Each warehouse defines its lines (rows), sections (rack types), and dimensions.
 * Location code format: {Line}{Position:2}{Side} e.g. A01R, A01L
 * 
 * Designed to support multiple warehouses (CS-1, CS-2, CS-3, etc.)
 */

export const WAREHOUSES = {
  'CS-3': {
    id: 'CS-3',
    name: 'Cold Storage 3',
    // Lines on the left side of the central aisle (bottom to top in physical layout)
    leftLines: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'],
    // Lines on the right side of the central aisle (top to bottom in physical layout)
    rightLines: ['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'BB', 'CC', 'DD'],
    // Rack sections for each line, ordered left-to-right across the warehouse
    sections: [
      { id: 'LL', label: 'Left (Long)',  side: 'L', positions: 8, levels: 4, desc: '8x4/15' },
      { id: 'RS', label: 'Right (Short)', side: 'R', positions: 4, levels: 4, desc: '4x4/15' },
      // --- Central Aisle ---
      { id: 'LS', label: 'Left (Short)',  side: 'L', positions: 4, levels: 4, desc: '4x4/15' },
      { id: 'RL', label: 'Right (Long)',  side: 'R', positions: 8, levels: 4, desc: '8x4/15' },
    ],
    totalLevels: 4
  }
};

// Helper: Get all lines for a warehouse
export function getAllLines(warehouseId) {
  const wh = WAREHOUSES[warehouseId];
  if (!wh) return [];
  return [...wh.leftLines, ...wh.rightLines];
}

// Helper: Get all location codes for a warehouse
export function getAllLocationCodes(warehouseId) {
  const wh = WAREHOUSES[warehouseId];
  if (!wh) return [];
  const codes = [];
  const allLines = [...wh.leftLines, ...wh.rightLines];
  for (const line of allLines) {
    for (const section of wh.sections) {
      for (let pos = 1; pos <= section.positions; pos++) {
        const posStr = String(pos).padStart(2, '0');
        const code = `${line}${posStr}${section.side}`;
        codes.push(code);
      }
    }
  }
  return codes;
}

// Helper: Parse a location code like "A01R-1" or "CC01-1" into parts
export function parseLocationCode(code) {
  if (!code) return null;
  const upper = code.toUpperCase().trim();
  // Match patterns: A01R-1, AA03L-2, A01R, DD08L  — and also CC01-1 (no L/R side)
  const match = upper.match(/^([A-Z]{1,2})(\d{1,2})([LR])?(?:-(\d+))?$/);
  if (!match) return null;
  return {
    line: match[1],
    position: parseInt(match[2]),
    side: match[3] || 'L',
    level: match[4] ? parseInt(match[4]) : null,
    raw: upper
  };
}

/**
 * Nearest vs Far location logic:
 * - Nearest: positions 04 and 08 (e.g. F04R, F08R) — closest to aisle
 * - Far: position 01 (e.g. F01L, F01R) — near wall
 * Same logic applies to both sides: A–O (left) and P–DD (right)
 * Returns 0 = nearest (first), 1 = other, 2 = far (last)
 */
export function getLocationSortRank(code) {
  const parsed = parseLocationCode(code);
  if (!parsed) return 2;
  const pos = parsed.position;
  if (pos === 4 || pos === 8) return 0;  // 04, 08 = nearest
  if (pos === 1) return 2;               // 01 = far
  return 1;                              // other positions
}

/** Sort locations: nearest (04, 08) first, then others, far (01) last */
export function sortLocationsNearestFirst(items, linePlaceKey = 'line_place') {
  const getKey = (it) => typeof it === 'string' ? it : (it && it[linePlaceKey]);
  const parseLine = (lp) => {
    if (!lp) return 'ZZZZ';
    const m = String(lp).match(/^([A-Za-z]+)/);
    return m ? m[1].toUpperCase() : 'ZZZZ';
  };
  return [...items].sort((a, b) => {
    const lpA = getKey(a);
    const lpB = getKey(b);
    const rankA = getLocationSortRank(lpA);
    const rankB = getLocationSortRank(lpB);
    if (rankA !== rankB) return rankA - rankB;
    const lineA = parseLine(lpA);
    const lineB = parseLine(lpB);
    if (lineA !== lineB) return lineA.localeCompare(lineB);
    return String(lpA || '').localeCompare(String(lpB || ''));
  });
}

export default WAREHOUSES;
