You do not need a full 3D engine. You need a **thin 2D world** for the bots and a **normal web chat UI** on top of it. Kenney’s All-in-1 pack is built for exactly that: UI kits, characters, rooms, SFX. Putting the actual conversation inside a game canvas is the usual mistake — scrolling, markdown, copy/paste, and mobile keyboards all fight you.

## What this project actually is

It is a chat frontend with a game skin:

- a room / desk / little HQ where each bot lives as a sprite
- click a bot → that conversation opens
- Kenney panels, buttons, cursors, SFX for the chrome
- real chat (streaming text, history, maybe tools) as HTML

That last part should stay HTML. Phaser/Godot/Three.js are bad at being a text editor.

## Use this stack

**Phaser 4 + Vite + TypeScript + a DOM chat overlay.**

Why Phaser and not the others:

| Option | Verdict for this project |
|---|---|
| **Phaser 4** | Best fit. 2D sprites, scenes, audio, input, tiny web build. Kenney tutorials are everywhere. Grok Build writes it well. Official Vite+TS template exists. Current line is 4.2.x. |
| **PixiJS v8** | Faster renderer, but you rebuild scenes, audio, input yourself. Only worth it if Phaser feels heavy later. |
| **Svelte/React only** | Fastest path if you skip the “walk around a room” fantasy and just want avatars + Kenney UI as CSS/images. Valid plan B. |
| **Godot HTML5** | Great editor, Kenney even has Godot kits. Worse for *this*: heavier wasm download, GDScript is a second language, chat overlay is more awkward. |
| **Unity WebGL** | Do not. Huge payload for a bot lobby. |
| **Three.js / PlayCanvas** | Only if you specifically want a 3D Kenney office (Furniture Kit, Space Station, etc.). Cool, 3× the work, not needed to chat. |

Phaser is the default because your assets are 2D-first, the target is a browser tab, and you already ship web (Vercel). Godot is the fallback if you fall in love with dragging Kenney tiles around in an editor instead of coding scenes.

Official start:

```bash
npm create @phaserjs/game@latest
```

Pick the Vite + TypeScript template.

## Hybrid layout (this is the important part)

```
┌─────────────────────────────────────────┐
│  Phaser canvas                          │
│  room, bot sprites, idle anims, SFX     │
│                                         │
│              ┌────────────────────────┐ │
│              │ HTML overlay           │ │
│              │ Kenney 9-slice panel   │ │
│              │ streaming chat         │ │
│              │ <textarea> / input     │ │
│              └────────────────────────┘ │
└─────────────────────────────────────────┘
```

- Phaser owns: background, characters, click-to-select, particles, button click sounds.
- DOM owns: message list, markdown, input, history, copy, mobile keyboard.
- Style the overlay with Kenney UI Pack PNGs as 9-slice backgrounds (`border-image` or a tiny nine-slice helper). Do not draw the chat transcript as Phaser `Text` objects.

Phaser can sit under a React/Svelte app if you want, but start without a UI framework. One canvas + one overlay is enough.

## Which Kenney folders to actually use

Do not import the 516 MB zip into the web app. Curate a `public/kenney/` folder with maybe 20–80 files.

Start with these packs (names vary slightly inside All-in-1):

1. **UI Pack** (and UI Pack Sci-Fi / Adventure if you want a theme) — buttons, panels, sliders, checkboxes. This *is* your GUI.
2. **Cursor Pack** — custom pointer over the canvas.
3. **One character pack** — Abstract Platformer, Shape Characters, Animal Pack, or similar. Each Grok bot = one character + a color tint or hat so they are distinguishable.
4. **One interior / room pack** — Furniture Kit (3D, skip unless you go 3D) or 2D interior / office / sci-fi tiles. A single room is enough.
5. **Audio** — button clicks, notification blips, a short loop. Kenney has 1,200+ SFX.
6. **Fonts** that ship in the pack, or pair with something readable for chat (Kenney display fonts are for titles; use a real UI font for messages).

Everything else stays on disk as a palette. Your inspecting bot should output a short inventory: “these 12 buttons, these 4 characters, this tileset” — not “here are 60,000 files.”

License is CC0. No attribution required. Still nice to drop `Assets: Kenney.nl` in an about panel.

## Architecture to hand Grok Build

Keep the game dumb and the chat smart.

```
src/
  game/
    scenes/Boot.ts, Preload.ts, HQ.ts
    bots.ts          // id, name, sprite key, color, system prompt
    uiBridge.ts      // emit 'bot-selected', listen 'chat-open'
  chat/
    ChatOverlay.ts   // DOM
    api.ts           // your bot backend, never the xAI key in the client
  main.ts
public/kenney/...
```

Rules that will save you a week:

- One Phaser scene for the HQ. Do not build a Metroidvania.
- Bots are data: `{ id, name, sprite, prompt, color }`. Adding a bot is a JSON row + a sprite key.
- Canvas click → `CustomEvent('select-bot')` → overlay opens that thread.
- Streaming responses stay in the DOM.
- API key stays on a tiny server (Vercel function, or whatever already fronts your bots). Browser never sees it.
- Preload only the curated Kenney subset. Atlas/spritesheet the UI and characters.

If your Grok bots already live as local agents / file drop / inbox JSON (the pattern some people use for desktop Grok Bot), the overlay just POSTs to that same pipe. If they are xAI API personas, a 30-line serverless proxy is enough.

## How “game-like” to go

Ship in this order so it is usable before it is cute:

1. Static HQ background + 2–3 bot sprites + click opens a Kenney-styled HTML panel + echo chat.
2. Idle bob / blink animations, click SFX, selected-bot outline.
3. Real streaming to your bots.
4. Per-bot rooms or a camera pan only if 1–3 feels empty.
5. 3D Kenney kits only if you specifically want a little office diorama. That is a different project.

You can stop at step 3 and have something you will actually use.

## What I would not do

- Godot/Unity first “because engines are easier.” They are easier for *games*. This is a chat product wearing a game coat.
- Drawing the transcript in the canvas.
- Dumping the whole All-in-1 zip into `public/`.
- Mixing 2D Kenney UI with 3D Kenney rooms on day one.
- Waiting for a custom engine. Phaser + DOM is the whole stack.

## Prompt you can give Grok Build

Something like:

> Vite + TypeScript + Phaser 4.2. HQ scene using Kenney sprites from `public/kenney`. Three bot sprites, click selects. DOM overlay chat panel styled with Kenney UI Pack 9-slice panels. Overlay talks to `/api/chat`. Do not render chat text in Phaser. Keep scenes to Boot, Preload, HQ.

That is the whole product, just dressed in Kenney. If the inspecting bot comes back with a concrete file list from the zip, the next useful step is a one-page “asset shortlist” (exact PNG paths + which bot they map to) and then let Grok Build scaffold the Phaser project against those paths.