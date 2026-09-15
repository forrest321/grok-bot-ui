import Phaser, { Scene } from 'phaser';
import { ASLEEP_ICON, BOTS } from '../bots';

const PLAYER_KEY = 'tiny_player';

export class Preload extends Scene
{
    constructor ()
    {
        super('Preload');
    }

    init ()
    {
        this.add.rectangle(512, 384, 1024, 768, 0x1a1410);

        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(2, 0xc4a574);
        const bar = this.add.rectangle(282, 384, 4, 28, 0xc4a574);

        this.load.on('progress', (progress: number) =>
        {
            bar.width = 4 + (460 * progress);
        });
    }

    preload ()
    {
        this.load.image('tiny-dungeon', 'kenney/tiled/tilemap_packed.png');
        this.load.tilemapTiledJSON('hq-map', 'kenney/tiled/hq.json');

        for (const bot of BOTS)
        {
            this.load.image(bot.idleKey, `kenney/characters/${bot.idleKey}.png`);
            this.load.image(bot.talkKey, `kenney/characters/${bot.talkKey}.png`);
        }

        const extraKeys = new Set<string>([PLAYER_KEY, ASLEEP_ICON]);

        for (const bot of BOTS)
        {
            if (bot.busyIcon)
            {
                extraKeys.add(bot.busyIcon);
            }
        }

        for (const key of extraKeys)
        {
            this.load.image(key, `kenney/characters/${key}.png`);
        }

        this.load.audio('sfx-select', 'kenney/sfx/select_001.ogg');
        this.load.audio('sfx-hover', 'kenney/sfx/click1.ogg');
    }

    create ()
    {
        const keys = new Set<string>([PLAYER_KEY, ASLEEP_ICON, 'tiny-dungeon']);

        for (const bot of BOTS)
        {
            keys.add(bot.idleKey);
            keys.add(bot.talkKey);

            if (bot.busyIcon)
            {
                keys.add(bot.busyIcon);
            }
        }

        for (const key of keys)
        {
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        this.scene.start('HQ');
    }
}
