#!/usr/bin/env python3
"""Author the Tiny Dungeon HQ tilemap (Tiled JSON + TMX) and bot sprites.

Tileset: public/kenney/tiled/tilemap_packed.png (16×16, no spacing).
GIDs are 1-indexed into that sheet (Kenney tile N → GID N+1).

Spawn objects on layer `spawns` use pixel coordinates. Characters in HQ.ts
use origin (0.5, 1), so each point is the feet position (bottom-center of a
walkable floor tile).
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TILED = ROOT / "public" / "kenney" / "tiled"
SHEET = TILED / "tilemap_packed.png"
CHARS = ROOT / "public" / "kenney" / "characters"

W, H = 32, 24
TILE = 16
COLS = 12
SPRITE = 48

# Tileset GIDs (1-indexed)
FILL = 1
FILL_PEBBLE = 13
FILL_STONE = 25
BRICK = 41
FACE_L = 37
FACE_M = 38
FACE_R = 39
FACE_CAP = 40
BANNER = 30
PILLAR = 8
FLOOR = 49
FLOOR_DOT = 50
FLOOR_PEBBLE = 43
CHEST = 55
CRATE = 64
ANVIL = 65
TABLE = 73
STOOL = 74

# Kenney 0-indexed character tiles → 48×48 NEAREST sprites
# idle, talk (talk may reuse idle when the pack has no pose)
BOT_TILES = {
    "cos": (96, 97),
    "foss": (84, 84),
    "randy": (87, 87),
    "redax": (112, 112),
    "photo": (99, 99),
}
PLAYER_TILE = 85
STALE_SPRITES = (
    "tiny_ops_idle.png",
    "tiny_ops_talk.png",
    "tiny_research_idle.png",
    "tiny_research_talk.png",
    "tiny_build_idle.png",
    "tiny_build_talk.png",
)


def in_bounds(x: int, y: int) -> bool:
    return 0 <= x < W and 0 <= y < H


def make_walls() -> list[list[bool]]:
    wall = [[False] * W for _ in range(H)]

    def rect(x0: int, y0: int, x1: int, y1: int) -> None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                wall[y][x] = True

    def punch(x0: int, y0: int, x1: int, y1: int) -> None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                wall[y][x] = False

    # 2-tile outer frame
    rect(0, 0, W - 1, 1)
    rect(0, H - 2, W - 1, H - 1)
    rect(0, 0, 1, H - 1)
    rect(W - 2, 0, W - 1, H - 1)

    # Foss (NW): south + east stall, open to courtyard
    rect(2, 7, 9, 7)  # south
    rect(9, 2, 9, 7)  # east
    punch(7, 7, 9, 7)  # doorway south

    # Randy (E): west + north + south, open west
    rect(22, 5, 29, 5)  # north
    rect(22, 14, 29, 14)  # south
    rect(22, 5, 22, 14)  # west
    punch(22, 8, 22, 11)  # doorway west

    # Redax (SW): north + east stall, open north
    rect(2, 16, 11, 16)  # north
    rect(11, 16, 11, 21)  # east
    punch(7, 16, 10, 16)  # doorway north

    # Photo (SE): north + west stall, open west
    rect(22, 17, 29, 17)  # north
    rect(22, 17, 22, 21)  # west
    punch(22, 19, 22, 21)  # doorway west

    return wall


def is_wall(wall: list[list[bool]], x: int, y: int) -> bool:
    if not in_bounds(x, y):
        return True
    return wall[y][x]


def autotile(wall: list[list[bool]], x: int, y: int, rng: random.Random) -> int:
    n = is_wall(wall, x, y - 1)
    e = is_wall(wall, x + 1, y)
    s = is_wall(wall, x, y + 1)
    w = is_wall(wall, x - 1, y)

    if n and e and s and w:
        roll = rng.random()
        if roll < 0.08:
            return FILL_PEBBLE
        if roll < 0.14:
            return FILL_STONE
        return FILL

    # Courtyard-facing south edges get the 3D brick face.
    if not s:
        left = not w
        right = not e
        if y == 1 and x in (6, 16, 26):
            return BANNER
        if y == 1 and x in (12, 20):
            return PILLAR
        if left and right:
            return FACE_CAP
        if left:
            return FACE_L
        if right:
            return FACE_R
        return FACE_M

    return BRICK


def floor_gid(x: int, y: int, wall: list[list[bool]], rng: random.Random) -> int:
    if wall[y][x]:
        return 0
    # Alcove tints so rooms read as distinct floors
    if x <= 8 and y <= 6:
        return FLOOR_DOT if rng.random() < 0.35 else FLOOR
    if x >= 23 and 6 <= y <= 13:
        return FLOOR_PEBBLE if rng.random() < 0.3 else FLOOR
    if x <= 10 and y >= 17:
        return FLOOR_DOT if rng.random() < 0.35 else FLOOR
    if x >= 23 and y >= 18:
        return FLOOR_PEBBLE if rng.random() < 0.3 else FLOOR
    if rng.random() < 0.12:
        return FLOOR_DOT
    if rng.random() < 0.08:
        return FLOOR_PEBBLE
    return FLOOR


def build_layers() -> tuple[list[int], list[int], list[int]]:
    rng = random.Random(7)
    wall = make_walls()
    ground = [0] * (W * H)
    walls = [0] * (W * H)
    props = [0] * (W * H)

    for y in range(H):
        for x in range(W):
            i = y * W + x
            ground[i] = floor_gid(x, y, wall, rng)
            if wall[y][x]:
                walls[i] = autotile(wall, x, y, rng)

    # Opaque tan under wall south-faces so brick sits on sand, not void.
    for y in range(H):
        for x in range(W):
            i = y * W + x
            if walls[i] in (FACE_L, FACE_M, FACE_R, FACE_CAP, BANNER, PILLAR):
                if ground[i] == 0:
                    ground[i] = FLOOR

    def put_prop(x: int, y: int, gid: int) -> None:
        if not in_bounds(x, y) or wall[y][x]:
            raise SystemExit(f"prop on wall or oob: {x},{y}")
        props[y * W + x] = gid

    # CoS hub desk (courtyard, between CoS and player)
    put_prop(16, 14, TABLE)
    put_prop(17, 14, STOOL)
    # Foss (NW): storage
    put_prop(3, 3, CHEST)
    put_prop(4, 3, CRATE)
    # Randy (E): desk
    put_prop(27, 7, TABLE)
    put_prop(28, 7, STOOL)
    # Redax (SW): workbench
    put_prop(3, 18, CRATE)
    put_prop(8, 20, ANVIL)
    # Photo (SE): desk
    put_prop(27, 19, TABLE)
    put_prop(28, 19, STOOL)
    put_prop(24, 20, CRATE)

    return ground, walls, props


def feet(tx: int, ty: int) -> tuple[int, int]:
    """Pixel feet position: bottom-center of tile (tx, ty)."""
    return tx * TILE + TILE // 2, ty * TILE + TILE


def spawns() -> list[dict]:
    points = [
        ("foss", *feet(5, 6)),
        ("randy", *feet(26, 10)),
        ("redax", *feet(6, 21)),
        ("photo", *feet(26, 21)),
        ("cos", *feet(16, 12)),
        ("player", *feet(14, 16)),
    ]
    objects = []
    for i, (name, x, y) in enumerate(points, start=1):
        objects.append(
            {
                "id": i,
                "name": name,
                "type": "spawn",
                "point": True,
                "x": x,
                "y": y,
                "width": 0,
                "height": 0,
                "rotation": 0,
                "visible": True,
            }
        )
    return objects


def tileset_def() -> dict:
    return {
        "columns": COLS,
        "firstgid": 1,
        "image": "tilemap_packed.png",
        "imageheight": 176,
        "imagewidth": 192,
        "margin": 0,
        "name": "tiny-dungeon",
        "spacing": 0,
        "tilecount": 132,
        "tileheight": TILE,
        "tilewidth": TILE,
    }


def csv_rows(data: list[int]) -> str:
    lines = []
    for y in range(H):
        row = data[y * W : (y + 1) * W]
        lines.append(",".join(str(v) for v in row))
    return ",\n".join(lines) + "\n"


def write_json(ground: list[int], walls: list[int], props: list[int]) -> None:
    spawn_objs = spawns()
    doc = {
        "compressionlevel": -1,
        "height": H,
        "width": W,
        "infinite": False,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.10.2",
        "tileheight": TILE,
        "tilewidth": TILE,
        "type": "map",
        "version": "1.10",
        "nextlayerid": 5,
        "nextobjectid": len(spawn_objs) + 1,
        "tilesets": [tileset_def()],
        "layers": [
            {
                "id": 1,
                "name": "ground",
                "type": "tilelayer",
                "width": W,
                "height": H,
                "x": 0,
                "y": 0,
                "opacity": 1,
                "visible": True,
                "data": ground,
            },
            {
                "id": 2,
                "name": "walls",
                "type": "tilelayer",
                "width": W,
                "height": H,
                "x": 0,
                "y": 0,
                "opacity": 1,
                "visible": True,
                "data": walls,
            },
            {
                "id": 3,
                "name": "props",
                "type": "tilelayer",
                "width": W,
                "height": H,
                "x": 0,
                "y": 0,
                "opacity": 1,
                "visible": True,
                "data": props,
            },
            {
                "id": 4,
                "name": "spawns",
                "type": "objectgroup",
                "draworder": "topdown",
                "x": 0,
                "y": 0,
                "opacity": 1,
                "visible": True,
                "objects": spawn_objs,
                "properties": [
                    {
                        "name": "coordSpace",
                        "type": "string",
                        "value": "pixels",
                    },
                    {
                        "name": "originNote",
                        "type": "string",
                        "value": "Point is feet; HQ sprites use origin (0.5, 1)",
                    },
                ],
            },
        ],
    }
    path = TILED / "hq.json"
    path.write_text(json.dumps(doc, indent=2) + "\n")
    print(f"wrote {path}")


def write_tmx(ground: list[int], walls: list[int], props: list[int]) -> None:
    spawn_objs = spawns()
    object_xml = []
    for obj in spawn_objs:
        object_xml.append(
            f'  <object id="{obj["id"]}" name="{obj["name"]}" type="spawn" '
            f'x="{obj["x"]}" y="{obj["y"]}">\n   <point/>\n  </object>'
        )
    tmx = f"""<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.10.2" orientation="orthogonal" renderorder="right-down" width="{W}" height="{H}" tilewidth="{TILE}" tileheight="{TILE}" infinite="0" nextlayerid="5" nextobjectid="{len(spawn_objs) + 1}">
 <tileset firstgid="1" source="tiny-dungeon.tsx"/>
 <layer id="1" name="ground" width="{W}" height="{H}">
  <data encoding="csv">
{csv_rows(ground)}  </data>
 </layer>
 <layer id="2" name="walls" width="{W}" height="{H}">
  <data encoding="csv">
{csv_rows(walls)}  </data>
 </layer>
 <layer id="3" name="props" width="{W}" height="{H}">
  <data encoding="csv">
{csv_rows(props)}  </data>
 </layer>
 <objectgroup id="4" name="spawns" draworder="topdown">
  <properties>
   <property name="coordSpace" value="pixels"/>
   <property name="originNote" value="Point is feet; HQ sprites use origin (0.5, 1)"/>
  </properties>
{chr(10).join(object_xml)}
 </objectgroup>
</map>
"""
    path = TILED / "hq.tmx"
    path.write_text(tmx)
    print(f"wrote {path}")


def render_preview(ground: list[int], walls: list[int], props: list[int]) -> None:
    sheet = Image.open(SHEET).convert("RGBA")
    frames: list[Image.Image] = []
    for i in range(132):
        r, c = divmod(i, COLS)
        frames.append(sheet.crop((c * TILE, r * TILE, c * TILE + TILE, r * TILE + TILE)))

    out = Image.new("RGBA", (W * TILE, H * TILE), (236, 173, 123, 255))

    def blit(data: list[int]) -> None:
        for i, gid in enumerate(data):
            if gid <= 0:
                continue
            y, x = divmod(i, W)
            out.alpha_composite(frames[gid - 1], (x * TILE, y * TILE))

    blit(ground)
    blit(walls)
    blit(props)

    from PIL import ImageDraw

    draw = ImageDraw.Draw(out)
    for obj in spawns():
        x, y = int(obj["x"]), int(obj["y"])
        draw.ellipse((x - 2, y - 4, x + 2, y), outline=(40, 40, 80, 255), width=1)

    scale = 3
    big = out.resize((W * TILE * scale, H * TILE * scale), Image.NEAREST)
    preview = Path("/tmp/hq-preview.png")
    big.save(preview)
    print(f"wrote {preview} {big.size}")


def crop_tile(sheet: Image.Image, index: int) -> Image.Image:
    """Kenney 0-indexed tile from the packed sheet."""
    row, col = divmod(index, COLS)
    return sheet.crop((col * TILE, row * TILE, col * TILE + TILE, row * TILE + TILE))


def export_sprite(sheet: Image.Image, index: int, dest: Path) -> None:
    tile = crop_tile(sheet, index)
    sprite = tile.resize((SPRITE, SPRITE), Image.NEAREST)
    dest.parent.mkdir(parents=True, exist_ok=True)
    sprite.save(dest)
    print(f"wrote {dest} tile {index}")


def export_characters() -> None:
    sheet = Image.open(SHEET).convert("RGBA")
    CHARS.mkdir(parents=True, exist_ok=True)

    for bot_id, (idle, talk) in BOT_TILES.items():
        export_sprite(sheet, idle, CHARS / f"tiny_{bot_id}_idle.png")
        export_sprite(sheet, talk, CHARS / f"tiny_{bot_id}_talk.png")

    export_sprite(sheet, PLAYER_TILE, CHARS / "tiny_player.png")

    for name in STALE_SPRITES:
        path = CHARS / name
        if path.exists():
            path.unlink()
            print(f"removed {path}")


def fix_tsx() -> None:
    tsx = TILED / "tiny-dungeon.tsx"
    tsx.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.10.2" name="tiny-dungeon" tilewidth="16" tileheight="16" tilecount="132" columns="12">
 <image source="tilemap_packed.png" width="192" height="176"/>
</tileset>
"""
    )
    print(f"wrote {tsx}")


def main() -> None:
    TILED.mkdir(parents=True, exist_ok=True)
    ground, walls, props = build_layers()
    write_json(ground, walls, props)
    write_tmx(ground, walls, props)
    render_preview(ground, walls, props)
    fix_tsx()
    export_characters()


if __name__ == "__main__":
    main()
