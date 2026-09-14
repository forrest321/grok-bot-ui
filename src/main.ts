import StartGame from './game/main';
import { ChatOverlay } from './chat/ChatOverlay';

document.addEventListener('DOMContentLoaded', () =>
{
    const chatRoot = document.getElementById('chat-root');

    if (!chatRoot)
    {
        throw new Error('Missing #chat-root');
    }

    new ChatOverlay(chatRoot);
    StartGame('game-container');
});
