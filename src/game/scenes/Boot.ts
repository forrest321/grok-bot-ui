import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        this.load.image('hq-bg', 'kenney/room/hq-bg-v5.png');
    }

    create ()
    {
        this.scene.start('Preload');
    }
}
