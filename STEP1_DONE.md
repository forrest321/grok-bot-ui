# Step 1 done — static HQ + echo chat

## Run

```bash
npm install
npm run dev
```

Open http://localhost:8080/

Production check:

```bash
npm run build
```

## What you should see

- Kenney HQ room covering the 1024×768 canvas
- Three clickable bots on the left: **Ops**, **Research**, **Build**
- Click a bot → Kenney 9-slice HTML panel on the right, talk pose on that sprite
- Type and send → the message is echoed as the assistant reply (chunked)
- Switching bots keeps per-bot history; close/minimize hide the panel; sprites stay clickable

Chat transcript is DOM, not Phaser Text. Phaser 4.2.1.

## What changed

- Scenes are only **Boot → Preload → HQ**. Demo MainMenu / Game / GameOver removed.
- `src/game/bots.ts` + `src/game/uiBridge.ts` (`bot-selected` / `chat-closed`)
- `src/chat/ChatOverlay.ts` + `src/chat/api.ts` (echo shaped like a future `POST /api/chat`)
- Overlay chrome uses `public/kenney/ui` via CSS `border-image`
- Package renamed to `grok-bot-ui`; Phaser pinned to `4.2.1`
