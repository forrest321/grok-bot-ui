import Phaser, { GameObjects, Scene } from 'phaser';
import { ASLEEP_ICON, getBot, type BotId, type WorkerStatus } from '../bots';
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
    prompt?: GameObjects.Text;
};

const SLOTS: { id: BotId; x: number; y: number }[] = [
    { id: 'cos', x: 400, y: 385 },
    { id: 'ops', x: 300, y: 345 },
    { id: 'research', x: 520, y: 340 },
    { id: 'build', x: 310, y: 430 },
];

const PLAYER_START = { x: 455, y: 425 };
const PLAYER_SPEED = 140;
const INTERACT_RANGE = 56;
const BOB_PX = 6;
const SELECTED_BOB = 0.18;
const ASLEEP_BOB = 0.4;
const STATUS_LIFT = 50;
const MARKER_STROKE = 0xfff3d0;
const ASLEEP_TINT = 0x666688;
const STATUS_CYCLE_MS = 8000;
const WORKER_CYCLE: WorkerStatus[] = ['busy', 'asleep', 'idle'];

export class HQ extends Scene
{
    private bots: BotView[] = [];
    private selectedId: BotId | null = null;
    private readonly botScale = 1.0;
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
        this.placeBackground();
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

    private placeBackground (): void
    {
        const bg = this.add.image(512, 384, 'hq-bg');
        const cover = Math.max(this.scale.width / bg.width, this.scale.height / bg.height);
        bg.setScale(cover);
        bg.setDepth(-1000);
    }

    private placeBots (): void
    {
        SLOTS.forEach((slot, index) =>
        {
            const def = getBot(slot.id);
            const marker = this.add.ellipse(slot.x, slot.y - 4, 36, 12, def.color, 0.34);
            const sprite = this.add.image(slot.x, slot.y, def.idleKey);
            sprite.setOrigin(0.5, 1);
            sprite.setScale(this.botScale);
            sprite.setInteractive();

            const nameLabel = this.add.text(slot.x, slot.y + 4, def.name, {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: def.talkable ? '13px' : '14px',
                color: '#f4efe6',
                stroke: '#1a1410',
                strokeThickness: 4,
            }).setOrigin(0.5, 0);

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
                const icon = this.add.image(slot.x, slot.y - STATUS_LIFT, def.busyIcon ?? ASLEEP_ICON);
                icon.setOrigin(0.5, 0.5);
                icon.setScale(1);
                bot.statusIcon = icon;

                bot.zzz = this.add.text(slot.x + 14, slot.y - STATUS_LIFT - 6, 'Zzz', {
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '10px',
                    color: '#c8d4ee',
                    stroke: '#1a1410',
                    strokeThickness: 3,
                }).setOrigin(0, 0.5).setVisible(false);

                this.applyWorkerStatus(bot);
            }

            bot.prompt = this.add.text(slot.x, slot.y - 52, 'E', {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '12px',
                color: '#fff3d0',
                stroke: '#1a1410',
                strokeThickness: 4,
            }).setOrigin(0.5, 1).setVisible(false);

            sprite.on('pointerover', () =>
            {
                bot.hovered = true;
                this.sound.play('sfx-hover', { volume: 0.22 });
                this.applySpriteScale(bot);
            });
            sprite.on('pointerout', () =>
            {
                bot.hovered = false;
                this.applySpriteScale(bot);
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
        this.player = this.add.image(PLAYER_START.x, PLAYER_START.y, 'tiny_player');
        this.player.setOrigin(0.5, 1);
        this.player.setDepth(PLAYER_START.y);
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
            offset: 5,
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
        this.refuseWorker(bot);
        uiBridge.inspectWorker(bot.id);
    }

    private selectTalkable (id: BotId): void
    {
        this.sound.play('sfx-select');
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
            shakeX: 4,
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
            this.applyMarker(bot, selected && bot.talkable);
        }
    }

    private applySpriteScale (bot: BotView): void
    {
        const selected = bot.id === this.selectedId;
        let scale = this.botScale;

        if (selected)
        {
            scale *= bot.hovered ? 1.16 : 1.12;
        }
        else if (bot.hovered)
        {
            scale *= 1.08;
        }

        bot.sprite.setScale(scale);
    }

    private applyMarker (bot: BotView, selected: boolean): void
    {
        const def = getBot(bot.id);

        bot.marker.setFillStyle(def.color, selected ? 0.9 : 0.34);
        bot.marker.setStrokeStyle(selected ? 4 : 0, MARKER_STROKE, selected ? 0.95 : 0);
        bot.marker.setScale(selected ? 1.24 : 1);
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
        }
        else if (status === 'busy')
        {
            bot.sprite.clearTint();
            icon.setTexture(def.busyIcon ?? ASLEEP_ICON);
            icon.setVisible(true);
            zzz?.setVisible(false);
        }
        else
        {
            bot.sprite.clearTint();
            icon.setVisible(false);
            zzz?.setVisible(false);
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
        bot.marker.setPosition(bot.restX, bot.restY - 4);
        bot.nameLabel.setPosition(bot.restX, bot.restY + 4);

        const depth = spriteY;
        bot.marker.setDepth(depth - 10);
        bot.sprite.setDepth(depth);
        bot.nameLabel.setDepth(depth + 3);

        if (bot.statusIcon)
        {
            const bob = bot.statusIcon.visible ? bot.statusBobOffset : 0;
            bot.statusIcon.setPosition(bot.restX + bot.shakeX, spriteY - STATUS_LIFT - bob);
            bot.statusIcon.setDepth(depth + 1);
        }

        if (bot.zzz)
        {
            bot.zzz.setPosition(bot.restX + 14, spriteY - STATUS_LIFT - 6);
            bot.zzz.setDepth(depth + 2);
        }

        if (bot.prompt)
        {
            const promptY = bot.statusIcon ? spriteY - STATUS_LIFT - 18 : spriteY - 52;
            bot.prompt.setPosition(bot.restX, promptY);
            bot.prompt.setDepth(depth + 4);
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
        this.player.x += (vx / length) * step;
        this.player.y += (vy / length) * step;
        this.player.x = Phaser.Math.Clamp(this.player.x, 16, 1008);
        this.player.y = Phaser.Math.Clamp(this.player.y, 24, 768);

        if (vx < 0)
        {
            this.player.setFlipX(true);
        }
        else if (vx > 0)
        {
            this.player.setFlipX(false);
        }
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
