# Step 2 done — idle polish + selection feedback

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

- Unselected bots **idle-bob** (small vertical tween, staggered so they are not in lockstep)
- Click a bot → Kenney 9-slice HTML overlay still opens, **echo chat still works**
- Selected bot switches to talk pose, **bob damps**, sprite scales up slightly
- Selected floor ellipse is stronger: brighter fill, cream stroke, larger scale
- Unselected bots keep bobbing; optional faint alpha blink every few seconds
- Click still plays `sfx-select` (`select_001.ogg`)
- Hover plays a quiet tick (`click1.ogg` as `sfx-hover`) — already in `public/kenney/sfx/`, no new Kenney files
- Close the overlay → selection marker and talk pose clear, bob returns

Chat transcript is still DOM, not Phaser Text. Phaser 4.2.1.

## What changed

- `src/game/scenes/HQ.ts` — idle bob, damped selected bob, blink, hover/selected scale, stronger marker
- `src/game/scenes/Preload.ts` — load `sfx-hover` from existing `kenney/sfx/click1.ogg`

Step 1 echo overlay is unchanged (`src/chat/ChatOverlay.ts`).
