import type { BotId } from './bots';

export const BOT_SELECTED = 'bot-selected';
export const CHAT_CLOSED = 'chat-closed';
export const WORKER_INSPECTED = 'worker-inspected';

export type BotSelectedDetail = {
    id: BotId;
};

export type WorkerInspectedDetail = {
    id: BotId;
};

class UiBridge extends EventTarget
{
    selectBot (id: BotId): void
    {
        this.dispatchEvent(new CustomEvent<BotSelectedDetail>(BOT_SELECTED, { detail: { id } }));
    }

    inspectWorker (id: BotId): void
    {
        this.dispatchEvent(new CustomEvent<WorkerInspectedDetail>(WORKER_INSPECTED, { detail: { id } }));
    }

    closeChat (): void
    {
        this.dispatchEvent(new Event(CHAT_CLOSED));
    }
}

export const uiBridge = new UiBridge();
