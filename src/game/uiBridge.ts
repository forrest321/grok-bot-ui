import type { BotId } from './bots';

export const BOT_SELECTED = 'bot-selected';
export const CHAT_CLOSED = 'chat-closed';

export type BotSelectedDetail = {
    id: BotId;
};

class UiBridge extends EventTarget
{
    selectBot (id: BotId): void
    {
        this.dispatchEvent(new CustomEvent<BotSelectedDetail>(BOT_SELECTED, { detail: { id } }));
    }

    closeChat (): void
    {
        this.dispatchEvent(new Event(CHAT_CLOSED));
    }
}

export const uiBridge = new UiBridge();
