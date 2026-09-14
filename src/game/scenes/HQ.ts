import { GameObjects, Scene } from 'phaser';
import { getBot, type BotId } from '../bots';
import { CHAT_CLOSED, uiBridge } from '../uiBridge';

type BotView = {
    id: BotId;
    sprite: GameObjects.Image;
    marker: GameObjects.Ellipse;
    restY: number;
    hovered: boolean;
};

const SLOTS: { id: BotId; x: number; y: number }[] = [
    { id: 'ops', x: 250, y: 400 },
    { id: 'research', x: 455, y: 545 },
    { id: 'build', x: 280, y: 680 },
];

const BOB_PX = 6;
const SELECTED_BOB = 0.18;
const MARKER_STROKE = 0xfff3d0;

export class HQ extends Scene
{
    private bots: BotView[] = [];
    private selectedId: BotId | null = null;
    private readonly botScale = 1.15;

    constructor ()
    {
        super('HQ');
    }

    create ()
    {
        this.placeBackground();
        this.placeBots();
        this.input.setDefaultCursor('url(kenney/cursor/pointer_l.png) 6 2, pointer');

        const onClosed = (): void => this.setSelected(null);
        uiBridge.addEventListener(CHAT_CLOSED, onClosed);
        this.events.once('shutdown', () =>
        {
            uiBridge.removeEventListener(CHAT_CLOSED, onClosed);
        });
    }

    private placeBackground (): void
    {
        const bg = this.add.image(512, 384, 'hq-bg');
        const cover = Math.max(this.scale.width / bg.width, this.scale.height / bg.height);
        bg.setScale(cover);
    }

    private placeBots (): void
    {
        SLOTS.forEach((slot, index) =>
        {
            const def = getBot(slot.id);
            const marker = this.add.ellipse(slot.x, slot.y - 8, 72, 22, def.color, 0.34);
            const sprite = this.add.image(slot.x, slot.y, def.idleKey);
            sprite.setOrigin(0.5, 1);
            sprite.setScale(this.botScale);
            sprite.setInteractive();

            const bot: BotView = {
                id: def.id,
                sprite,
                marker,
                restY: slot.y,
                hovered: false,
            };

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
            sprite.on('pointerdown', () => this.onBotClicked(def.id));

            this.add.text(slot.x, slot.y + 4, def.name, {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '14px',
                color: '#f4efe6',
                stroke: '#1a1410',
                strokeThickness: 4,
            }).setOrigin(0.5, 0);

            this.startIdleBob(bot, index);
            this.scheduleBlink(bot, index);
            this.bots.push(bot);
        });
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
                const amp = bot.id === this.selectedId ? SELECTED_BOB : 1;
                bot.sprite.y = bot.restY - motion.offset * amp;
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

    private onBotClicked (id: BotId): void
    {
        this.sound.play('sfx-select');
        this.setSelected(id);
        uiBridge.selectBot(id);
    }

    private setSelected (id: BotId | null): void
    {
        this.selectedId = id;

        for (const bot of this.bots)
        {
            const def = getBot(bot.id);
            const selected = bot.id === id;

            this.tweens.killTweensOf(bot.sprite);
            bot.sprite.setAlpha(1);
            bot.sprite.setTexture(selected ? def.talkKey : def.idleKey);
            this.applySpriteScale(bot);
            this.applyMarker(bot, selected);
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
}
