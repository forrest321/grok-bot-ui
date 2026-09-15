import Phaser, { GameObjects, Scene } from 'phaser';
import { ASLEEP_ICON, BOTS, getBot, type BotId, type WorkerStatus } from '../bots';
import { CHAT_CLOSED, uiBridge } from '../uiBridge';
import { applyWorkerStatusChange, initWorkerTasks } from '../workerTasks';

type BotView = {
    id: BotId;
    sprite: GameObjects.Image;
    marker: GameObjects.Ellipse;
    nameLabel: GameObjects.Text;
    restX: number;
    restY: number;
    bobOffset: number;
    statusBobOffset: number;
    shakeX: number;
    hovered: boolean;
    talkable: boolean;
    statusIcon?: GameObjects.Image;
    zzz?: GameObjects.Text;
    busyDots?: GameObjects.Text;
    nudge?: GameObjects.Text;
    prompt?: GameObjects.Text;
};

const PLAYER_SPEED = 140;
const INTERACT_RANGE = 56;
const BODY_HALF_W = 5;
const BODY_HEIGHT = 8;
const BOB_PX = 3;
const SELECTED_BOB = 0.18;
const ASLEEP_BOB = 0.4;
/** 48×48 NEAREST export × 0.5 = 24px ≈ 1.5 tiles in the 16px world. */
const CHAR_SCALE = 0.5;
const SPRITE_SRC = 48;
const SPRITE_H = SPRITE_SRC * CHAR_SCALE;
const NAMEPLATE_GAP = 2;
const STATUS_ICON_SCALE = 0.3;
const STATUS_SIDE = 10;
const MARKER_W = 18;
const MARKER_H = 6;
const MARKER_LIFT = 2;
const MARKER_STROKE = 0xfff3d0;
const ASLEEP_TINT = 0x666688;
const STATUS_CYCLE_MS = 8000;
const INSPECT_CHROME_MS = 6000;
const WORKER_CYCLE: WorkerStatus[] = ['busy', 'asleep', 'idle'];
const NAMEPLATE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '10px',
    color: '#f4efe6',
    stroke: '#1a1410',
    strokeThickness: 4,
};

export class HQ extends Scene
{
    private bots: BotView[] = [];
    private selectedId: BotId | null = null;
    private inspectedId: BotId | null = null;
    private readonly botScale = CHAR_SCALE;
    private map!: Phaser.Tilemaps.Tilemap;
    private wallsLayer!: Phaser.Tilemaps.TilemapLayer;
    private slots: { id: BotId; x: number; y: number }[] = [];
    private playerStart = { x: 0, y: 0 };
    private player!: GameObjects.Image;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
    private keyE!: Phaser.Input.Keyboard.Key;
    private typing = false;

    constructor ()
    {
        super('HQ');
    }

    create ()
    {
        this.placeTilemap();
        this.readSpawns();
        this.placeBots();
        this.placePlayer();
        this.bindInput();
        initWorkerTasks();
        this.input.setDefaultCursor('url(kenney/cursor/pointer_l.png) 6 2, pointer');
        this.game.canvas.setAttribute('tabindex', '0');

        const onClosed = (): void =>
        {
            this.setSelected(null);
            this.setTypingCapture(false);
            this.game.canvas.focus();
        };
        uiBridge.addEventListener(CHAT_CLOSED, onClosed);
        this.events.once('shutdown', () =>
        {
            uiBridge.removeEventListener(CHAT_CLOSED, onClosed);
        });

        this.time.addEvent({
            delay: STATUS_CYCLE_MS,
            loop: true,
            callback: () => this.cycleWorkerStatuses(),
        });
    }

    update (_time: number, delta: number): void
    {
        this.syncTypingState();
        this.movePlayer(delta);
        this.updateInteractPrompt();
        this.tryProximityInteract();

        for (const bot of this.bots)
        {
            this.layoutBot(bot);
        }

        this.player.setDepth(this.player.y);
    }

    private placeTilemap (): void
    {
        this.map = this.make.tilemap({ key: 'hq-map' });
        const tileset = this.map.addTilesetImage('tiny-dungeon', 'tiny-dungeon', 16, 16, 0, 0);

        if (!tileset)
        {
            throw new Error('tiny-dungeon tileset missing');
        }

        this.add.rectangle(
            this.map.widthInPixels / 2,
            this.map.heightInPixels / 2,
            this.map.widthInPixels,
            this.map.heightInPixels,
            0xecad7b,
        ).setDepth(-2000);

        const ground = this.map.createLayer('ground', tileset, 0, 0);
        const walls = this.map.createLayer('walls', tileset, 0, 0);
        const props = this.map.createLayer('props', tileset, 0, 0);

        if (!ground || !walls || !props)
        {
            throw new Error('HQ tile layers missing');
        }

        ground.setDepth(-20);
        walls.setDepth(-10);
        props.setDepth(-5);
        this.wallsLayer = walls as Phaser.Tilemaps.TilemapLayer;

        this.cameras.main.setZoom(2);
        this.cameras.main.roundPixels = true;
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.centerOn(this.map.widthInPixels / 2, this.map.heightInPixels / 2);
    }

    /**
     * Spawn objects are Tiled point objects on layer `spawns`.
     * x/y are map pixels; sprites use origin (0.5, 1) so the point is the feet.
     */
    private readSpawns (): void
    {
        const layer = this.map.getObjectLayer('spawns');

        if (!layer)
        {
            throw new Error('Missing spawns object layer');
        }

        const byName = new Map(layer.objects.map((obj) => [obj.name, obj]));
        const ids = BOTS.map((bot) => bot.id);

        this.slots = ids.map((id) =>
        {
            const obj = byName.get(id);

            if (obj?.x === undefined || obj.y === undefined)
            {
                throw new Error(`Missing spawn: ${id}`);
            }

            return { id, x: obj.x, y: obj.y };
        });

        const player = byName.get('player');

        if (player?.x === undefined || player.y === undefined)
        {
            throw new Error('Missing spawn: player');
        }

        this.playerStart = { x: player.x, y: player.y };
    }

    private placeBots (): void
    {
        this.slots.forEach((slot, index) =>
        {
            const def = getBot(slot.id);
            const marker = this.add.ellipse(slot.x, slot.y - MARKER_LIFT, MARKER_W, MARKER_H, def.color, 0.34);
            const sprite = this.add.image(slot.x, slot.y, def.idleKey);
            sprite.setOrigin(0.5, 1);
            sprite.setScale(this.botScale);
            sprite.setInteractive();

            const nameLabel = this.add.text(slot.x, slot.y - SPRITE_H - NAMEPLATE_GAP, def.shortName, NAMEPLATE_STYLE)
                .setOrigin(0.5, 1)
                .setResolution(2)
                .setPadding(1);

            const bot: BotView = {
                id: def.id,
                sprite,
                marker,
                nameLabel,
                restX: slot.x,
                restY: slot.y,
                bobOffset: 0,
                statusBobOffset: 0,
                shakeX: 0,
                hovered: false,
                talkable: def.talkable,
            };

            if (!def.talkable)
            {
                const icon = this.add.image(slot.x - STATUS_SIDE, slot.y - SPRITE_H - NAMEPLATE_GAP, def.busyIcon ?? ASLEEP_ICON);
                icon.setOrigin(0.5, 1);
                icon.setScale(STATUS_ICON_SCALE);
                bot.statusIcon = icon;

                bot.zzz = this.add.text(slot.x + STATUS_SIDE, slot.y - SPRITE_H - NAMEPLATE_GAP, 'Zzz', {
                    ...NAMEPLATE_STYLE,
                    fontSize: '8px',
                    color: '#c8d4ee',
                }).setOrigin(0, 1).setResolution(2).setVisible(false);

                bot.busyDots = this.add.text(slot.x + STATUS_SIDE, slot.y - SPRITE_H - NAMEPLATE_GAP, '…', {
                    ...NAMEPLATE_STYLE,
                    fontSize: '10px',
                    color: '#fff3d0',
                }).setOrigin(0, 1).setResolution(2).setVisible(false);

                bot.nudge = this.add.text(slot.x, slot.y - SPRITE_H - NAMEPLATE_GAP - 8, '!', {
                    ...NAMEPLATE_STYLE,
                    fontSize: '10px',
                    color: '#ffd36a',
                }).setOrigin(0.5, 1).setResolution(2).setVisible(false);

                this.applyWorkerStatus(bot);
            }

            bot.prompt = this.add.text(slot.x, slot.y - SPRITE_H - NAMEPLATE_GAP - 9, 'E', {
                ...NAMEPLATE_STYLE,
                fontSize: '10px',
                color: '#fff3d0',
            }).setOrigin(0.5, 1).setResolution(2).setVisible(false);

            sprite.on('pointerover', () =>
            {
                bot.hovered = true;
                this.sound.play('sfx-hover', { volume: 0.22 });
                this.applySpriteScale(bot);
                this.applyMarker(bot);
            });
            sprite.on('pointerout', () =>
            {
                bot.hovered = false;
                this.applySpriteScale(bot);
                this.applyMarker(bot);
            });
            sprite.on('pointerdown', () => this.onBotClicked(bot));

            this.startIdleBob(bot, index);
            this.startStatusBob(bot, index);
            this.scheduleBlink(bot, index);
            this.bots.push(bot);
        });
    }

    private placePlayer (): void
    {
        this.player = this.add.image(this.playerStart.x, this.playerStart.y, 'tiny_player');
        this.player.setOrigin(0.5, 1);
        this.player.setScale(this.botScale);
        this.player.setDepth(this.playerStart.y);
    }

    private bindInput (): void
    {
        const keyboard = this.input.keyboard;

        if (!keyboard)
        {
            throw new Error('Keyboard plugin missing');
        }

        this.cursors = keyboard.createCursorKeys();
        this.wasd = keyboard.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
        this.keyE = keyboard.addKey('E');
        keyboard.addCapture('W,A,S,D,E,SPACE');
    }

    private startIdleBob (bot: BotView, index: number): void
    {
        const motion = { offset: 0 };

        this.tweens.add({
            targets: motion,
            offset: BOB_PX,
            duration: 980 + index * 160,
            delay: index * 220,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () =>
            {
                bot.bobOffset = motion.offset;
            },
        });
    }

    private startStatusBob (bot: BotView, index: number): void
    {
        if (!bot.statusIcon)
        {
            return;
        }

        const motion = { offset: 0 };

        this.tweens.add({
            targets: motion,
            offset: 3,
            duration: 720 + index * 90,
            delay: index * 140,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () =>
            {
                bot.statusBobOffset = motion.offset;
            },
        });
    }

    private scheduleBlink (bot: BotView, index: number): void
    {
        this.time.addEvent({
            delay: 3100 + index * 700,
            loop: true,
            callback: () => this.tryBlink(bot),
        });
    }

    private tryBlink (bot: BotView): void
    {
        if (bot.id === this.selectedId || bot.sprite.alpha < 1)
        {
            return;
        }

        const def = getBot(bot.id);

        if (def.status === 'asleep')
        {
            return;
        }

        if (Math.random() > 0.55)
        {
            return;
        }

        this.tweens.add({
            targets: bot.sprite,
            alpha: 0.62,
            duration: 55,
            yoyo: true,
            hold: 35,
            ease: 'Quad.easeInOut',
        });
    }

    private onBotClicked (bot: BotView): void
    {
        if (!bot.talkable)
        {
            this.inspectWorker(bot);
            return;
        }

        this.selectTalkable(bot.id);
    }

    private inspectWorker (bot: BotView): void
    {
        this.sound.play('sfx-select');
        this.inspectedId = bot.id;
        this.setSelected(null);
        this.refuseWorker(bot);
        uiBridge.inspectWorker(bot.id);
        this.applyMarker(bot);
        this.time.delayedCall(INSPECT_CHROME_MS, () =>
        {
            if (this.inspectedId === bot.id)
            {
                this.inspectedId = null;
                this.applySpriteScale(bot);
                this.applyMarker(bot);
            }
        });
    }

    private selectTalkable (id: BotId): void
    {
        this.sound.play('sfx-select');
        this.inspectedId = null;
        this.setSelected(id);
        uiBridge.selectBot(id);
    }

    private refuseWorker (bot: BotView): void
    {
        this.tweens.killTweensOf(bot);
        this.tweens.killTweensOf(bot.sprite);
        bot.sprite.setAlpha(1);
        bot.shakeX = 0;

        this.tweens.add({
            targets: bot,
            shakeX: 2,
            duration: 45,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () =>
            {
                bot.shakeX = 0;
            },
        });
    }

    private setSelected (id: BotId | null): void
    {
        this.selectedId = id;

        for (const bot of this.bots)
        {
            const def = getBot(bot.id);
            const selected = bot.id === id;

            if (bot.talkable)
            {
                this.tweens.killTweensOf(bot.sprite);
                bot.sprite.setAlpha(1);
                bot.sprite.setTexture(selected ? def.talkKey : def.idleKey);
            }

            this.applySpriteScale(bot);
            this.applyMarker(bot);
        }
    }

    private isLit (bot: BotView): boolean
    {
        return bot.id === this.selectedId || bot.id === this.inspectedId;
    }

    private applySpriteScale (bot: BotView): void
    {
        const lit = this.isLit(bot);
        let scale = this.botScale;

        if (lit)
        {
            scale *= bot.hovered ? 1.16 : 1.12;
        }
        else if (bot.hovered)
        {
            scale *= 1.08;
        }

        bot.sprite.setScale(scale);
    }

    private applyMarker (bot: BotView): void
    {
        const def = getBot(bot.id);
        const lit = this.isLit(bot);
        const hovered = bot.hovered && !lit;

        bot.marker.setFillStyle(def.color, lit ? 0.9 : hovered ? 0.62 : 0.34);
        bot.marker.setStrokeStyle(
            lit ? 2 : hovered ? 1 : 0,
            MARKER_STROKE,
            lit ? 0.95 : hovered ? 0.8 : 0,
        );
        bot.marker.setScale(lit ? 1.24 : hovered ? 1.12 : 1);
    }

    private applyWorkerStatus (bot: BotView): void
    {
        const def = getBot(bot.id);
        const icon = bot.statusIcon;
        const zzz = bot.zzz;

        if (!icon || def.talkable)
        {
            return;
        }

        const status = def.status ?? 'idle';

        if (status === 'asleep')
        {
            bot.sprite.setTint(ASLEEP_TINT);
            icon.setTexture(ASLEEP_ICON);
            icon.setVisible(true);
            zzz?.setVisible(true);
            bot.busyDots?.setVisible(false);
        }
        else if (status === 'busy')
        {
            bot.sprite.clearTint();
            icon.setTexture(def.busyIcon ?? ASLEEP_ICON);
            icon.setVisible(true);
            zzz?.setVisible(false);
            bot.busyDots?.setVisible(true);
        }
        else
        {
            bot.sprite.clearTint();
            icon.setVisible(false);
            zzz?.setVisible(false);
            bot.busyDots?.setVisible(false);
        }
    }

    private cycleWorkerStatuses (): void
    {
        for (const bot of this.bots)
        {
            const def = getBot(bot.id);

            if (def.talkable || !def.status)
            {
                continue;
            }

            const index = WORKER_CYCLE.indexOf(def.status);
            def.status = WORKER_CYCLE[(index + 1) % WORKER_CYCLE.length];
            applyWorkerStatusChange(def.id, def.status);
            this.applyWorkerStatus(bot);
        }
    }

    private layoutBot (bot: BotView): void
    {
        const def = getBot(bot.id);
        const selected = bot.id === this.selectedId;
        const asleep = def.status === 'asleep';
        const bobAmp = selected ? SELECTED_BOB : asleep ? ASLEEP_BOB : 1;
        const spriteY = bot.restY - bot.bobOffset * bobAmp;

        bot.sprite.x = bot.restX + bot.shakeX;
        bot.sprite.y = spriteY;
        bot.marker.setPosition(bot.restX, bot.restY - MARKER_LIFT);

        const plateY = spriteY - bot.sprite.displayHeight - NAMEPLATE_GAP;
        const iconBob = bot.statusIcon?.visible ? bot.statusBobOffset * 0.35 : 0;
        bot.nameLabel.setPosition(bot.restX, plateY);

        const depth = spriteY;
        bot.marker.setDepth(depth - 10);
        bot.sprite.setDepth(depth);
        bot.nameLabel.setDepth(depth + 3);

        if (bot.statusIcon)
        {
            bot.statusIcon.setPosition(bot.restX - STATUS_SIDE + bot.shakeX, plateY - iconBob);
            bot.statusIcon.setDepth(depth + 1);
        }

        if (bot.zzz)
        {
            bot.zzz.setPosition(bot.restX + STATUS_SIDE - 2, plateY);
            bot.zzz.setDepth(depth + 2);
        }

        if (bot.busyDots)
        {
            bot.busyDots.setPosition(bot.restX + STATUS_SIDE - 2, plateY);
            bot.busyDots.setDepth(depth + 2);
        }

        if (bot.nudge)
        {
            bot.nudge.setPosition(bot.restX, plateY - 8);
            bot.nudge.setDepth(depth + 4);
        }

        if (bot.prompt)
        {
            bot.prompt.setPosition(bot.restX, plateY - 9);
            bot.prompt.setDepth(depth + 5);
        }
    }

    private movePlayer (delta: number): void
    {
        if (this.typing)
        {
            return;
        }

        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.A.isDown)
        {
            vx -= 1;
        }

        if (this.cursors.right.isDown || this.wasd.D.isDown)
        {
            vx += 1;
        }

        if (this.cursors.up.isDown || this.wasd.W.isDown)
        {
            vy -= 1;
        }

        if (this.cursors.down.isDown || this.wasd.S.isDown)
        {
            vy += 1;
        }

        if (vx === 0 && vy === 0)
        {
            return;
        }

        const length = Math.hypot(vx, vy);
        const step = PLAYER_SPEED * (delta / 1000);
        const nextX = this.player.x + (vx / length) * step;
        const nextY = this.player.y + (vy / length) * step;

        if (!this.blockedAt(nextX, this.player.y))
        {
            this.player.x = nextX;
        }

        if (!this.blockedAt(this.player.x, nextY))
        {
            this.player.y = nextY;
        }

        if (vx < 0)
        {
            this.player.setFlipX(true);
        }
        else if (vx > 0)
        {
            this.player.setFlipX(false);
        }
    }

    private blockedAt (x: number, y: number): boolean
    {
        const points: Array<[number, number]> = [
            [x - BODY_HALF_W, y - 1],
            [x + BODY_HALF_W, y - 1],
            [x - BODY_HALF_W, y - BODY_HEIGHT],
            [x + BODY_HALF_W, y - BODY_HEIGHT],
        ];

        for (const [px, py] of points)
        {
            if (px < 0 || py < 0 || px >= this.map.widthInPixels || py >= this.map.heightInPixels)
            {
                return true;
            }

            const tile = this.wallsLayer.getTileAtWorldXY(px, py);

            if (tile && tile.index > 0)
            {
                return true;
            }
        }

        return false;
    }

    private nearestBotInRange (): BotView | null
    {
        let best: BotView | null = null;
        let bestDist = INTERACT_RANGE;

        for (const bot of this.bots)
        {
            const dist = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                bot.sprite.x,
                bot.sprite.y,
            );

            if (dist <= bestDist)
            {
                best = bot;
                bestDist = dist;
            }
        }

        return best;
    }

    private updateInteractPrompt (): void
    {
        const near = this.typing ? null : this.nearestBotInRange();

        for (const bot of this.bots)
        {
            bot.prompt?.setVisible(near?.id === bot.id && this.selectedId !== bot.id);
        }
    }

    private tryProximityInteract (): void
    {
        if (this.typing)
        {
            return;
        }

        const pressed = Phaser.Input.Keyboard.JustDown(this.keyE)
            || Phaser.Input.Keyboard.JustDown(this.cursors.space);

        if (!pressed)
        {
            return;
        }

        const target = this.nearestBotInRange();

        if (!target)
        {
            return;
        }

        if (target.talkable)
        {
            this.selectTalkable(target.id);
            return;
        }

        this.inspectWorker(target);
    }

    private isChatInputFocused (): boolean
    {
        const el = document.activeElement;

        return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    }

    private syncTypingState (): void
    {
        const typing = this.isChatInputFocused();

        if (typing === this.typing)
        {
            return;
        }

        this.setTypingCapture(typing);
    }

    private setTypingCapture (typing: boolean): void
    {
        this.typing = typing;
        const keyboard = this.input.keyboard;

        if (!keyboard)
        {
            return;
        }

        if (typing)
        {
            keyboard.disableGlobalCapture();
            keyboard.resetKeys();
        }
        else
        {
            keyboard.enableGlobalCapture();
            keyboard.resetKeys();
        }
    }
}
