# Tile Calc — Interaction Spec

## Core Data Model

### Occupancy Bitmap
Each room has a 1-inch resolution bitmap (`Int16Array`). Values:
- `0` = outside room polygon
- `1` = inside room, empty (available for placement)
- `2+` = occupied by tile ID (tile index + 2)

The bitmap is the single source of truth for what space is available.

### Tile Piece
A tile piece has:
- `x, y` — position in world inches
- `w, h` — actual dimensions of this piece
- `type` — `full` or `cut`
- `cutEdges` — `{l, t, r, b}` booleans. `true` = that side was cut (flat, no puzzle tab). `false` = original puzzle tab edge.

### Grid Increment
User-configurable snap increment (default 12"). Controls:
- Grid snapping for all tile placement
- Cut dimensions when clipping to room boundary (snaps DOWN to increment)
- Changing increment auto-recomputes simulation

### Tile Types
Only two types: `full` (all 4 edges are puzzle tabs) and `cut` (at least one edge is flat).
No "reused" distinction — a cut tile is a cut tile regardless of origin.

### Cut Edge Physics
Every physical tile starts with 4 puzzle-tab edges. Each cut creates 2 flat edges (one on each piece). Conservation:
- `tab_edges + cut_edges = 4 × tiles_consumed`
- Merging two complementary halves: seam edges cancel, outer edges preserved
- Only becomes `full` again if all 4 outer edges are tabs

### Toolbox
Array of tile pieces not currently placed. Room-agnostic.
- **Drag from toolbox**: mousedown starts drag, identical to canvas tile drag
- **Consolidation**: complementary pieces auto-merge (dimensions sum to full tile size, outer edges preserved)
- **Edge labels**: each item shows which edges are cut (✂L/T/R/B)

## Interactions

### Remove tile (X button)
- Hover a placed tile → X button appears top-left
- Click X → tile goes to toolbox, bitmap cleared to `1` (empty)

### Rotate tile (↻ button or R key)
- Hover an asymmetric tile or one with asymmetric cut edges → rotate button appears top-right
- Click rotate → tile rotates 90° CW in place (bitmap updated)
- R key during drag → rotates the dragged piece preview

### Drag tile (canvas or toolbox)
1. **Start**: mousedown on placed tile or toolbox item
2. **Threshold**: 5px movement triggers drag
3. **Source cleared**: canvas tile → `occClear` + `clearSlot`; toolbox item → spliced from array
4. **During drag**: ghost outline at cursor + snapped preview at grid position
   - Green outline = valid placement
   - Red outline = invalid (overlap or outside room)
   - Cut edge indicators shown on preview
5. **R key**: rotates piece 90° CW (cycles through 0°/90°/180°/270°)
6. **Drop on valid position**: `freePlaceTile` with rotation applied
   - Clips to room boundary at increment-snapped dimensions
   - Offcuts go to toolbox
   - Cut edges set on clipped sides
7. **Drop on invalid/nothing**: tile goes to toolbox

### Free Placement Logic
Given a piece `{w, h, cutEdges}` dropped at world coords `(wx, wy)`:

1. Find which room the cursor is in
2. Snap position to grid increment
3. Clip to room bounding box (snap clip dimensions DOWN to increment)
4. Check occupancy bitmap — all room pixels must be `1` (empty)
5. Place: stamp tile ID on bitmap, add to tile array
6. Create offcuts for trimmed portions → toolbox
7. Try merge with adjacent tiles

### Restore All
- Replaces all tile arrays from `simResults._snapshot` (deep clone made at simulation time)
- Rebuilds occupancy bitmap from restored tiles
- Clears toolbox
- Bulletproof regardless of how many edits happened

## Auto-Recompute
Changing tile size, increment, or budget automatically re-runs simulation in the current mode.

## Save/Load
`.tilecalc` JSON files store:
- Room geometry (verts, closed, priority, color, name)
- Tile config (width, height, tab depth, increment)
- Budget value, snap mode
- Version field for forward compatibility
