// Pure logic functions extracted for testing
// These are also used inline in index.html — keep in sync

export function snp(v) { return Math.round(v); }

export function distV(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }

export function fmtIn(inches) {
  const a = Math.abs(inches), ft = Math.floor(a / 12), rem = a % 12, s = inches < 0 ? '-' : '';
  if (ft === 0) return s + (rem % 1 ? rem.toFixed(1) : Math.round(rem)) + '"';
  if (rem < 0.05) return s + ft + "'";
  return s + ft + "' " + (rem % 1 ? rem.toFixed(1) : Math.round(rem)) + '"';
}

export function fmtFtIn(inches) {
  const ft = Math.floor(inches / 12), rem = inches % 12;
  if (rem < 0.05) return ft + ' ft';
  return ft + "'" + Math.round(rem) + '"';
}

export function parseLen(s) {
  s = s.trim();
  let m = s.match(/^(\d+\.?\d*)\s*'\s*(\d+\.?\d*)?\s*"?\s*$/);
  if (m) return parseFloat(m[1]) * 12 + (m[2] ? parseFloat(m[2]) : 0);
  m = s.match(/^(\d+\.?\d*)\s*"$/);
  if (m) return parseFloat(m[1]);
  m = s.match(/^(\d+\.?\d*)\s*'$/);
  if (m) return parseFloat(m[1]) * 12;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function wallOrient(a, b) {
  return Math.abs(a.x - b.x) >= Math.abs(a.y - b.y) ? 'h' : 'v';
}

export function pip(verts, px, py) {
  let ins = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x, yi = verts[i].y, xj = verts[j].x, yj = verts[j].y;
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

export function constrainHV(wx, wy, from, shouldSnap) {
  if (!shouldSnap || !from) return { x: snp(wx), y: snp(wy) };
  const sx = snp(wx), sy = snp(wy);
  return Math.abs(sx - from.x) >= Math.abs(sy - from.y)
    ? { x: sx, y: from.y } : { x: from.x, y: sy };
}

// Tile placement logic
export function placeTileInSlot(srcTile, dstT, toolbox) {
  const TOL = 0.125;
  const sw = srcTile.w, sh = srcTile.h;
  const dw = dstT._slotW || dstT.w, dh = dstT._slotH || dstT.h;
  const fits = sw <= dw + TOL && sh <= dh + TOL;
  const canCut = sw >= dw - TOL && sh >= dh - TOL;
  if (!fits && !canCut) return false;
  if (!dstT._origType) dstT._origType = dstT.type;
  if (fits) {
    dstT.w = sw; dstT.h = sh;
    dstT.type = srcTile.type;
    dstT.cutEdges = srcTile.cutEdges ? { ...srcTile.cutEdges } : { l: false, t: false, r: false, b: false };
  } else {
    const cutR = sw > dw + TOL, cutB = sh > dh + TOL;
    dstT.w = Math.min(sw, dw); dstT.h = Math.min(sh, dh);
    dstT.type = 'cut';
    dstT.cutEdges = {
      l: srcTile.cutEdges ? srcTile.cutEdges.l : false,
      t: srcTile.cutEdges ? srcTile.cutEdges.t : false,
      r: cutR ? true : (srcTile.cutEdges ? srcTile.cutEdges.r : false),
      b: cutB ? true : (srcTile.cutEdges ? srcTile.cutEdges.b : false)
    };
    const remW = sw - dstT.w, remH = sh - dstT.h;
    if (remW > 1 && dstT.h > 1)
      toolbox.push({ tile: { w: remW, h: dstT.h, type: 'cut', cutEdges: { l: true, t: srcTile.cutEdges ? srcTile.cutEdges.t : false, r: srcTile.cutEdges ? srcTile.cutEdges.r : false, b: srcTile.cutEdges ? srcTile.cutEdges.b : false } } });
    if (remH > 1 && sw > 1)
      toolbox.push({ tile: { w: sw, h: remH, type: 'cut', cutEdges: { l: srcTile.cutEdges ? srcTile.cutEdges.l : false, t: true, r: srcTile.cutEdges ? srcTile.cutEdges.r : false, b: srcTile.cutEdges ? srcTile.cutEdges.b : false } } });
  }
  dstT._reallocated = true;
  return true;
}

export function clearSlot(t) {
  t.type = 'unfilled';
  t.w = t._slotW || t.w;
  t.h = t._slotH || t.h;
  t.cutEdges = null;
}

export function consolidateToolbox(toolbox, tw, th) {
  const TOL = 0.125;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < toolbox.length; i++) {
      const a = toolbox[i].tile;
      for (let j = i + 1; j < toolbox.length; j++) {
        const b = toolbox[j].tile;
        if (Math.abs(a.h - b.h) < TOL && Math.abs(a.w + b.w - tw) < TOL) {
          toolbox[i] = { tile: { w: tw, h: th, type: 'full', cutEdges: { l: false, t: false, r: false, b: false } } };
          toolbox.splice(j, 1); changed = true; break;
        }
        if (Math.abs(a.w - b.w) < TOL && Math.abs(a.h + b.h - th) < TOL) {
          toolbox[i] = { tile: { w: tw, h: th, type: 'full', cutEdges: { l: false, t: false, r: false, b: false } } };
          toolbox.splice(j, 1); changed = true; break;
        }
      }
      if (changed) break;
    }
  }
}

export function overlapsAny(tiles, x, y, w, h, excludeTi) {
  const TOL = 0.5;
  for (let i = 0; i < tiles.length; i++) {
    if (i === excludeTi) continue;
    const t = tiles[i];
    if (t.type === 'removed' || t.type === 'unfilled') continue;
    if (x + w > t.x + TOL && x < t.x + t.w - TOL && y + h > t.y + TOL && y < t.y + t.h - TOL) return true;
  }
  return false;
}

export function rectInRoom(verts, x, y, w, h) {
  if (!verts || verts.length < 3) return 0;
  let inside = 0, total = 0;
  const step = Math.max(1, Math.min(w, h) / 4);
  for (let py = y + step / 2; py < y + h; py += step)
    for (let px = x + step / 2; px < x + w; px += step) { total++; if (pip(verts, px, py)) inside++; }
  return total > 0 ? inside / total : 0;
}

export function snapToTileGrid(wx, wy, minX, minY, tw, th) {
  const halfW = tw / 2, halfH = th / 2;
  const gx = Math.round((wx - minX) / halfW) * halfW + minX;
  const gy = Math.round((wy - minY) / halfH) * halfH + minY;
  return { x: gx, y: gy };
}
