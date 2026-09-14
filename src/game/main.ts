import { AUTO, Game } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { HQ } from './scenes/HQ';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#1a1410',
    pixelArt: true,
    roundPixels: true,
    scene: [
        Boot,
        Preload,
        HQ,
    ],
};

const StartGame = (parent: string) =>
{
    return new Game({ ...config, parent });
};

export default StartGame;
