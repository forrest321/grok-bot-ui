# grok-bot-ui — asset shortlist (locked)

**Active machine: Mini** (`~/Documents/code/grok-bot-ui`)

| Role | Choice |
|------|--------|
| Bots | Blocky Characters — `a` Ops, `e` Research, `k` Build |
| Chrome | UI Adventure Pack panels + UI Pack Blue/Grey buttons |
| Cursor | Cursor Pack `pointer_l.png` |
| Room | **Tiled Tiny Dungeon HQ** — `public/kenney/tiled/hq.json` (Phaser) + `hq.tmx` (Tiled) + `tilemap_packed.png` |
| SFX | Interface Sounds + UI Audio click1 |

Talk pose = idle for Blocky previews (no alternate frames).

## HQ tilemap

- Tileset: `tiny-dungeon` → `kenney/tiled/tilemap_packed.png` (16×16, no spacing).
- Layers: `ground` (floor), `walls` (collidable), `props` (non-colliding decor), object layer `spawns`.
- Spawn points (`spawns`): named Tiled **point** objects `cos`, `ops`, `research`, `build`, `player`. Coordinates are **map pixels**; HQ sprites use origin `(0.5, 1)`, so each point is the feet position (bottom-center of a walkable floor tile).
- Author via `python3 scripts/generate-hq-map.py`. Do not use the Kenney `sampleMap.tmx` as the HQ.
