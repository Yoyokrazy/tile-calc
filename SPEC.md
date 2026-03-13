# Tile Calc — Budget Mode Tile Interaction Spec

## Core Data Model

### Tile Slot
Every position in the simulation grid is a **slot**. A slot always exists at its grid position `{x, y}` with the slot's expected dimensions `{slotW, slotH}`. A slot has a **state**:

- `filled` — a tile (or piece of one) occupies this slot. Has `tile: {w, h, type, cutEdges}`.
- `empty` — nothing here, available for placement. Rendered with grey hatching.

The **slot dimensions** (`slotW, slotH`) never change — they represent what the simulation computed as the needed piece for that position. The **tile** inside a slot can be equal to or smaller than the slot.

### Tile Piece
A tile piece has:
- `w, h` — actual dimensions of this piece
- `type` — `full`, `cut`, `reused` (display hint only)
- `cutEdges` — `{l, t, r, b}` booleans. `true` = that side was cut (flat, needs endcap). `false` = original puzzle tab edge.

### Toolbox
An array of tile pieces not currently placed. Room-agnostic. Pieces can be:
- Picked up from toolbox → "held" → placed into an empty slot
- Combined: complementary cuts auto-merge into full tiles

## Interactions

### Remove tile (X button)
- Hover a filled slot → X button appears top-left
- Click X → tile piece moves to toolbox, slot becomes `empty`
- The slot retains its original `slotW, slotH` for future placement

### Pick from toolbox
- Click toolbox item → piece is "held" (green outline at cursor)
- R key rotates held piece 90°
- Hover empty slot → preview:
  - **Green**: piece fits (equal or smaller than slot)
  - **Orange + cut line**: piece is larger, will be cut. Shows the portion that fits and the offcut
  - **No highlight**: piece doesn't fit in either dimension after considering cut
- Click empty slot → place piece (with cut-to-fit if needed), offcuts to toolbox
- Click empty canvas or Esc → cancel hold

### Drag tile on canvas
- Hold+drag a filled tile → ghost outline follows cursor
- Source slot becomes `empty` immediately (so you can see it)
- Hover empty slot → same green/orange preview as toolbox
- Release on empty slot → place (with cut-to-fit)
- Release on non-empty or canvas → tile returns to toolbox (since source is already empty)

### Place logic (shared)
Given a piece `{w, h}` and a slot `{slotW, slotH}`:

1. **Exact fit** (`piece.w ≈ slot.w && piece.h ≈ slot.h`): place as-is
2. **Piece smaller** (`piece.w ≤ slot.w && piece.h ≤ slot.h`): place, piece keeps its dimensions
3. **Piece larger, can cut** (`piece.w ≥ slot.w && piece.h ≥ slot.h`): 
   - Cut piece to slot dimensions
   - Placed piece gets cut edges on trimmed sides
   - Offcuts (width remainder, height remainder) go to toolbox with cut edge on the cut side
   - Offcuts inherit non-cut edges from parent
4. **Mismatch** (piece larger in one dim, smaller in other): cannot place

### Restore All
- Every slot that was manually emptied (has `_origType`) gets restored
- Toolbox is cleared
- Does NOT restore the simulation — just undoes manual edits

## Edge Cases Identified

1. **White void**: When a tile smaller than its slot is removed, the slot should become `empty` with its *original* slotW/slotH — not the tile's smaller dimensions. Currently the slot's w/h gets overwritten when a small piece is placed.

2. **Drag cancel**: If you drag a tile and drop it on nothing, the source is already empty. The tile should go to toolbox rather than vanishing.

3. **Drag onto self**: Dropping back on the same slot should be a no-op (tile stays).

4. **Double-remove**: X button should not appear on empty slots.

5. **Slot dimension restoration**: When a piece is removed from a slot, the slot needs to remember its original simulation dimensions so future placements work correctly.

## Implementation

### State Snapshot
When simulation runs, `simResults._snapshot` stores a deep clone of all tile arrays. `Restore All` replaces tiles with the snapshot — handles any number of edits without incremental tracking.
