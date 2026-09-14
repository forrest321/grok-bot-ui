import Phaser, { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        this.load.image('hq-bg', 'kenney/room/hq-bg.png');
    }

    create ()
    {
        this.textures.get('hq-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.scene.start('Preload');
    }
}
