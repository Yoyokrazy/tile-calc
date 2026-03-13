import { describe, it, expect } from 'vitest';
import {
  snp, distV, fmtIn, fmtFtIn, parseLen, wallOrient, pip,
  constrainHV, placeTileInSlot, clearSlot, consolidateToolbox,
  overlapsAny, rectInRoom, snapToTileGrid
} from './lib.js';

// ===== Utility Functions =====

describe('snp (snap to integer)', () => {
  it('rounds to nearest integer', () => {
    expect(snp(3.4)).toBe(3);
    expect(snp(3.5)).toBe(4);
    expect(snp(3.6)).toBe(4);
    expect(snp(-1.7)).toBe(-2);
    expect(snp(0)).toBe(0);
  });
});

describe('distV', () => {
  it('computes distance between two points', () => {
    expect(distV({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distV({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
    expect(distV({ x: 0, y: 0 }, { x: 12, y: 0 })).toBe(12);
  });
});

// ===== Formatting =====

describe('fmtIn', () => {
  it('formats inches only', () => {
    expect(fmtIn(6)).toBe('6"');
    expect(fmtIn(0)).toBe('0"');
    expect(fmtIn(11)).toBe('11"');
  });
  it('formats feet only', () => {
    expect(fmtIn(12)).toBe("1'");
    expect(fmtIn(24)).toBe("2'");
    expect(fmtIn(60)).toBe("5'");
  });
  it('formats feet and inches', () => {
    expect(fmtIn(18)).toBe("1' 6\"");
    expect(fmtIn(30)).toBe("2' 6\"");
    expect(fmtIn(15)).toBe("1' 3\"");
  });
  it('handles fractional inches', () => {
    expect(fmtIn(6.5)).toBe('6.5"');
    expect(fmtIn(14.5)).toBe("1' 2.5\"");
  });
  it('handles negative values', () => {
    expect(fmtIn(-6)).toBe('-6"');
    expect(fmtIn(-18)).toBe("-1' 6\"");
  });
});

describe('fmtFtIn', () => {
  it('formats feet only when no remainder', () => {
    expect(fmtFtIn(24)).toBe('2 ft');
    expect(fmtFtIn(60)).toBe('5 ft');
  });
  it('formats feet and inches', () => {
    expect(fmtFtIn(18)).toBe("1'6\"");
    expect(fmtFtIn(30)).toBe("2'6\"");
  });
});

// ===== Parsing =====

describe('parseLen', () => {
  it('parses inches with quote', () => {
    expect(parseLen('24"')).toBe(24);
    expect(parseLen('6"')).toBe(6);
  });
  it('parses feet with quote', () => {
    expect(parseLen("5'")).toBe(60);
    expect(parseLen("10'")).toBe(120);
  });
  it('parses feet and inches', () => {
    expect(parseLen("5'6\"")).toBe(66);
    expect(parseLen("5' 6\"")).toBe(66);
    expect(parseLen("5'6")).toBe(66);
    expect(parseLen("1' 0")).toBe(12);
  });
  it('parses bare numbers as inches', () => {
    expect(parseLen('24')).toBe(24);
    expect(parseLen('12.5')).toBe(12.5);
  });
  it('returns null for invalid input', () => {
    expect(parseLen('abc')).toBeNull();
    expect(parseLen('')).toBeNull();
  });
  it('handles whitespace', () => {
    expect(parseLen('  24"  ')).toBe(24);
    expect(parseLen("  5'  6  ")).toBe(66);
  });
});

// ===== Geometry =====

describe('wallOrient', () => {
  it('detects horizontal walls', () => {
    expect(wallOrient({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe('h');
    expect(wallOrient({ x: 0, y: 5 }, { x: 50, y: 5 })).toBe('h');
  });
  it('detects vertical walls', () => {
    expect(wallOrient({ x: 0, y: 0 }, { x: 0, y: 100 })).toBe('v');
    expect(wallOrient({ x: 5, y: 0 }, { x: 5, y: 50 })).toBe('v');
  });
  it('diagonal defaults to h when equal', () => {
    expect(wallOrient({ x: 0, y: 0 }, { x: 10, y: 10 })).toBe('h');
  });
});

describe('pip (point in polygon)', () => {
  const square = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  it('detects point inside square', () => {
    expect(pip(square, 50, 50)).toBe(true);
    expect(pip(square, 1, 1)).toBe(true);
    expect(pip(square, 99, 99)).toBe(true);
  });
  it('detects point outside square', () => {
    expect(pip(square, -1, 50)).toBe(false);
    expect(pip(square, 101, 50)).toBe(false);
    expect(pip(square, 50, -1)).toBe(false);
    expect(pip(square, 50, 101)).toBe(false);
  });
  const lShape = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 100 }];
  it('handles L-shaped rooms', () => {
    expect(pip(lShape, 25, 25)).toBe(true);
    expect(pip(lShape, 75, 25)).toBe(true);
    expect(pip(lShape, 25, 75)).toBe(true);
    expect(pip(lShape, 75, 75)).toBe(false); // outside the L
  });
});

describe('constrainHV', () => {
  it('constrains to horizontal when dx > dy', () => {
    const r = constrainHV(50, 10, { x: 0, y: 0 }, true);
    expect(r.y).toBe(0);
    expect(r.x).toBe(50);
  });
  it('constrains to vertical when dy > dx', () => {
    const r = constrainHV(10, 50, { x: 0, y: 0 }, true);
    expect(r.x).toBe(0);
    expect(r.y).toBe(50);
  });
  it('does not constrain when snap disabled', () => {
    const r = constrainHV(33.7, 44.2, { x: 0, y: 0 }, false);
    expect(r.x).toBe(34);
    expect(r.y).toBe(44);
  });
});

// ===== Tile Slot Placement =====

describe('placeTileInSlot', () => {
  it('places exact-fit tile', () => {
    const toolbox = [];
    const src = { w: 24, h: 24, type: 'full', cutEdges: { l: false, t: false, r: false, b: false } };
    const dst = { x: 0, y: 0, w: 24, h: 24, _slotW: 24, _slotH: 24, type: 'unfilled' };
    expect(placeTileInSlot(src, dst, toolbox)).toBe(true);
    expect(dst.type).toBe('full');
    expect(dst.w).toBe(24);
    expect(dst.h).toBe(24);
    expect(toolbox).toHaveLength(0);
  });

  it('places smaller tile into larger slot', () => {
    const toolbox = [];
    const src = { w: 12, h: 24, type: 'cut', cutEdges: { l: false, t: false, r: true, b: false } };
    const dst = { x: 0, y: 0, w: 24, h: 24, _slotW: 24, _slotH: 24, type: 'unfilled' };
    expect(placeTileInSlot(src, dst, toolbox)).toBe(true);
    expect(dst.type).toBe('cut');
    expect(dst.w).toBe(12);
    expect(dst.h).toBe(24);
    expect(toolbox).toHaveLength(0);
  });

  it('cuts larger tile to fit, creates offcuts', () => {
    const toolbox = [];
    const src = { w: 24, h: 24, type: 'full', cutEdges: { l: false, t: false, r: false, b: false } };
    const dst = { x: 0, y: 0, w: 12, h: 24, _slotW: 12, _slotH: 24, type: 'unfilled' };
    expect(placeTileInSlot(src, dst, toolbox)).toBe(true);
    expect(dst.type).toBe('cut');
    expect(dst.w).toBe(12);
    expect(dst.cutEdges.r).toBe(true); // cut on right
    expect(toolbox.length).toBeGreaterThan(0);
    // Offcut should be 12x24
    const offcut = toolbox.find(t => t.tile.w === 12 && t.tile.h === 24);
    expect(offcut).toBeDefined();
    expect(offcut.tile.cutEdges.l).toBe(true); // cut on left side
  });

  it('rejects tile that cannot fit or be cut', () => {
    const toolbox = [];
    const src = { w: 12, h: 12, type: 'cut', cutEdges: null };
    const dst = { x: 0, y: 0, w: 24, h: 12, _slotW: 24, _slotH: 12, type: 'unfilled' };
    // 12x12 into 24x12: fits in h but not w → fits=true (12<=24, 12<=12)
    expect(placeTileInSlot(src, dst, toolbox)).toBe(true);
  });

  it('preserves cut edges from source tile', () => {
    const toolbox = [];
    const src = { w: 24, h: 24, type: 'cut', cutEdges: { l: true, t: false, r: false, b: true } };
    const dst = { x: 0, y: 0, w: 12, h: 24, _slotW: 12, _slotH: 24, type: 'unfilled' };
    placeTileInSlot(src, dst, toolbox);
    expect(dst.cutEdges.l).toBe(true); // preserved from source
    expect(dst.cutEdges.r).toBe(true); // new cut
    expect(dst.cutEdges.b).toBe(true); // preserved from source
  });
});

// ===== clearSlot =====

describe('clearSlot', () => {
  it('restores slot dimensions and sets unfilled', () => {
    const t = { x: 0, y: 0, w: 12, h: 24, _slotW: 24, _slotH: 24, type: 'cut', cutEdges: { l: true, t: false, r: false, b: false } };
    clearSlot(t);
    expect(t.type).toBe('unfilled');
    expect(t.w).toBe(24);
    expect(t.h).toBe(24);
    expect(t.cutEdges).toBeNull();
  });

  it('uses current w/h if no _slotW', () => {
    const t = { x: 0, y: 0, w: 18, h: 18, type: 'full' };
    clearSlot(t);
    expect(t.type).toBe('unfilled');
    expect(t.w).toBe(18);
    expect(t.h).toBe(18);
  });
});

// ===== consolidateToolbox =====

describe('consolidateToolbox', () => {
  it('merges two halves into a full tile (width)', () => {
    const tb = [
      { tile: { w: 12, h: 24, type: 'cut', cutEdges: { l: false, t: false, r: true, b: false } } },
      { tile: { w: 12, h: 24, type: 'cut', cutEdges: { l: true, t: false, r: false, b: false } } }
    ];
    consolidateToolbox(tb, 24, 24);
    expect(tb).toHaveLength(1);
    expect(tb[0].tile.type).toBe('full');
    expect(tb[0].tile.w).toBe(24);
    expect(tb[0].tile.h).toBe(24);
  });

  it('merges two halves into a full tile (height)', () => {
    const tb = [
      { tile: { w: 24, h: 12, type: 'cut', cutEdges: {} } },
      { tile: { w: 24, h: 12, type: 'cut', cutEdges: {} } }
    ];
    consolidateToolbox(tb, 24, 24);
    expect(tb).toHaveLength(1);
    expect(tb[0].tile.type).toBe('full');
  });

  it('does not merge incompatible pieces', () => {
    const tb = [
      { tile: { w: 12, h: 24, type: 'cut', cutEdges: {} } },
      { tile: { w: 8, h: 24, type: 'cut', cutEdges: {} } }
    ];
    consolidateToolbox(tb, 24, 24);
    expect(tb).toHaveLength(2);
  });

  it('handles empty toolbox', () => {
    const tb = [];
    consolidateToolbox(tb, 24, 24);
    expect(tb).toHaveLength(0);
  });

  it('chains multiple merges', () => {
    const tb = [
      { tile: { w: 12, h: 24, type: 'cut', cutEdges: {} } },
      { tile: { w: 12, h: 24, type: 'cut', cutEdges: {} } },
      { tile: { w: 12, h: 24, type: 'cut', cutEdges: {} } },
      { tile: { w: 12, h: 24, type: 'cut', cutEdges: {} } }
    ];
    consolidateToolbox(tb, 24, 24);
    expect(tb).toHaveLength(2);
    expect(tb[0].tile.type).toBe('full');
    expect(tb[1].tile.type).toBe('full');
  });
});

// ===== overlapsAny =====

describe('overlapsAny', () => {
  const tiles = [
    { x: 0, y: 0, w: 24, h: 24, type: 'full' },
    { x: 24, y: 0, w: 24, h: 24, type: 'full' },
    { x: 0, y: 24, w: 12, h: 24, type: 'cut' },
    { x: 48, y: 0, w: 24, h: 24, type: 'unfilled' } // should be ignored
  ];

  it('detects overlap with existing tile', () => {
    expect(overlapsAny(tiles, 12, 12, 24, 24, -1)).toBe(true);
  });
  it('allows adjacent placement (no overlap)', () => {
    expect(overlapsAny(tiles, 48, 0, 24, 24, -1)).toBe(false); // unfilled ignored
    expect(overlapsAny(tiles, 12, 24, 12, 24, -1)).toBe(false);
  });
  it('ignores excluded tile', () => {
    expect(overlapsAny(tiles, 0, 0, 24, 24, 0)).toBe(false);
  });
  it('ignores unfilled and removed tiles', () => {
    const t2 = [...tiles, { x: 72, y: 0, w: 24, h: 24, type: 'removed' }];
    expect(overlapsAny(t2, 72, 0, 24, 24, -1)).toBe(false);
  });
});

// ===== rectInRoom =====

describe('rectInRoom', () => {
  const square = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];

  it('returns ~1 for rect fully inside', () => {
    expect(rectInRoom(square, 10, 10, 20, 20)).toBeGreaterThan(0.9);
  });
  it('returns ~0 for rect fully outside', () => {
    expect(rectInRoom(square, 200, 200, 20, 20)).toBe(0);
  });
  it('returns partial for rect on edge', () => {
    const cov = rectInRoom(square, 90, 10, 20, 20);
    expect(cov).toBeGreaterThan(0);
    expect(cov).toBeLessThan(1);
  });
  it('returns 0 for empty verts', () => {
    expect(rectInRoom([], 0, 0, 10, 10)).toBe(0);
    expect(rectInRoom(null, 0, 0, 10, 10)).toBe(0);
  });
});

// ===== snapToTileGrid =====

describe('snapToTileGrid', () => {
  it('snaps to half-tile increments', () => {
    const r = snapToTileGrid(18, 30, 0, 0, 24, 24);
    expect(r.x).toBe(24); // 18 → nearest 12 = 24
    expect(r.y).toBe(36); // 30 → nearest 12 = 36
  });
  it('snaps relative to room origin', () => {
    const r = snapToTileGrid(20, 20, 6, 6, 24, 24);
    // 20-6=14, nearest 12 = 12, so 12+6=18
    expect(r.x).toBe(18);
    expect(r.y).toBe(18);
  });
  it('snaps to origin when close', () => {
    const r = snapToTileGrid(2, 3, 0, 0, 24, 24);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });
  it('works with non-square tiles', () => {
    const r = snapToTileGrid(15, 8, 0, 0, 24, 12);
    // halfW=12, halfH=6. 15→12, 8→6
    expect(r.x).toBe(12);
    expect(r.y).toBe(6);
  });
});
