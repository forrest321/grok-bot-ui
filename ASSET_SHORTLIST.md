# grok-bot-ui — asset shortlist (locked)

**Active machine: Mini** (`~/Documents/code/grok-bot-ui`)

| Role | Choice |
|------|--------|
| Bots | Tiny Dungeon characters — see tile map below |
| Chrome | UI Adventure Pack panels + UI Pack Blue/Grey buttons |
| Cursor | Cursor Pack `pointer_l.png` |
| Room | **Tiled Tiny Dungeon HQ** — `public/kenney/tiled/hq.json` (Phaser) + `hq.tmx` (Tiled) + `tilemap_packed.png` |
| SFX | Interface Sounds + UI Audio click1 |

Talk pose = idle except CoS (knight visor → open helm).

## HQ tilemap

- Tileset: `tiny-dungeon` → `kenney/tiled/tilemap_packed.png` (16×16, no spacing).
- Layers: `ground` (floor), `walls` (collidable), `props` (non-colliding decor), object layer `spawns`.
- Spawn points (`spawns`): named Tiled **point** objects `cos`, `foss`, `randy`, `redax`, `photo`, `player`. Coordinates are **map pixels**; HQ sprites use origin `(0.5, 1)`, so each point is the feet position (bottom-center of a walkable floor tile).
- Author via `python3 scripts/generate-hq-map.py` (also exports 48×48 NEAREST bot sprites). Do not use the Kenney `sampleMap.tmx` as the HQ. Do not revert to baked `hq-bg.png`.
- Display: `CHAR_SCALE` / `botScale` **0.5** in `HQ.ts` (24 world px ≈ 1.5 tiles). Camera zoom 2 maps 48×48 textures 1:1 to screen pixels. Keep NEAREST. Do not grow the map to fit oversized sprites.

## Bot sprites (Kenney 0-indexed tile → 48×48 NEAREST, drawn at 0.5)

| id | short | full | tile idle / talk | talkable | file prefix |
|----|-------|------|------------------|----------|-------------|
| cos | CoS | Chief of Staff | 96 / 97 | yes | `tiny_cos_*` |
| foss | Foss | Foss | 84 / 84 | no | `tiny_foss_*` |
| randy | Randy | Randy | 87 / 87 | no | `tiny_randy_*` |
| redax | Redax | Redax | 112 / 112 | no | `tiny_redax_*` |
| photo | Photo | Photo Desk | 99 / 99 | no | `tiny_photo_*` |
| player | — | Forrest | 85 | — | `tiny_player` |

Status icons (workers): `tiny_status_ghost` (asleep); Foss `tiny_status_potion`; Randy `tiny_status_shield`; Redax `tiny_status_hammer`; Photo `tiny_status_potion_115`.
