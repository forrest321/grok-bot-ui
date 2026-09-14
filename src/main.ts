import StartGame from './game/main';
import { ChatOverlay } from './chat/ChatOverlay';
import { WorkerStatusPanel } from './game/WorkerStatusPanel';

document.addEventListener('DOMContentLoaded', () =>
{
    const chatRoot = document.getElementById('chat-root');
    const statusRoot = document.getElementById('status-root');

    if (!chatRoot)
    {
        throw new Error('Missing #chat-root');
    }

    if (!statusRoot)
    {
        throw new Error('Missing #status-root');
    }

    new ChatOverlay(chatRoot);
    new WorkerStatusPanel(statusRoot);
    StartGame('game-container');
});
