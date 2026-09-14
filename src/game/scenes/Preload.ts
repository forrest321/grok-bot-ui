import Phaser, { Scene } from 'phaser';
import { BOTS } from '../bots';

export class Preload extends Scene
{
    constructor ()
    {
        super('Preload');
    }

    init ()
    {
        const bg = this.add.image(512, 384, 'hq-bg');
        bg.setScale(Math.max(this.scale.width / bg.width, this.scale.height / bg.height));

        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(2, 0x3b2a1a);
        const bar = this.add.rectangle(282, 384, 4, 28, 0x3b2a1a);

        this.load.on('progress', (progress: number) =>
        {
            bar.width = 4 + (460 * progress);
        });
    }

    preload ()
    {
        for (const bot of BOTS)
        {
            this.load.image(bot.idleKey, `kenney/characters/${bot.idleKey}.png`);
            this.load.image(bot.talkKey, `kenney/characters/${bot.talkKey}.png`);
        }

        this.load.audio('sfx-select', 'kenney/sfx/select_001.ogg');
        this.load.audio('sfx-hover', 'kenney/sfx/click1.ogg');
    }

    create ()
    {
        for (const bot of BOTS)
        {
            this.textures.get(bot.idleKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
            this.textures.get(bot.talkKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        this.scene.start('HQ');
    }
}
