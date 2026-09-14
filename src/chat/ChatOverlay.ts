import { streamChat, type ChatMessage } from './api';
import { getBot, type BotId } from '../game/bots';
import { BOT_SELECTED, uiBridge } from '../game/uiBridge';

export class ChatOverlay
{
    private readonly root: HTMLElement;
    private readonly panel: HTMLElement;
    private readonly titleEl: HTMLElement;
    private readonly dotEl: HTMLElement;
    private readonly logEl: HTMLElement;
    private readonly inputEl: HTMLInputElement;
    private readonly sendBtn: HTMLButtonElement;
    private readonly minBtn: HTMLButtonElement;
    private readonly emptyEl: HTMLElement;

    private readonly threads = new Map<BotId, ChatMessage[]>();
    private activeId: BotId | null = null;
    private inflight = new Set<BotId>();
    private minimized = false;

    constructor (root: HTMLElement)
    {
        this.root = root;
        this.root.classList.add('chat-root');

        this.panel = h('div', { class: 'chat-panel' });

        const header = h('header', { class: 'chat-header' });
        this.dotEl = h('span', { class: 'chat-dot' });
        this.titleEl = h('h2', { class: 'chat-title' });
        this.titleEl.textContent = 'Chat';

        const tools = h('div', { class: 'chat-tools' });
        this.minBtn = h('button', {
            class: 'chat-tool',
            type: 'button',
            'aria-label': 'Minimize',
        });
        this.minBtn.textContent = '–';
        const closeBtn = h('button', {
            class: 'chat-tool',
            type: 'button',
            'aria-label': 'Close',
        });
        closeBtn.textContent = '×';
        tools.append(this.minBtn, closeBtn);
        header.append(this.dotEl, this.titleEl, tools);

        this.logEl = h('div', {
            class: 'chat-messages',
            role: 'log',
            'aria-live': 'polite',
        });
        this.emptyEl = h('p', { class: 'chat-empty' });
        this.emptyEl.textContent = 'Talk to the Chief of Staff in the HQ.';
        this.logEl.append(this.emptyEl);

        const form = h('form', { class: 'chat-compose' });
        this.inputEl = h('input', {
            class: 'chat-input',
            type: 'text',
            name: 'message',
            autocomplete: 'off',
            maxlength: '2000',
            placeholder: 'Message…',
        });
        this.sendBtn = h('button', { class: 'chat-send', type: 'submit' });
        this.sendBtn.textContent = 'Send';
        form.append(this.inputEl, this.sendBtn);

        const credit = h('footer', { class: 'chat-credit' });
        credit.textContent = 'Assets: Kenney.nl';

        this.panel.append(header, this.logEl, form, credit);
        this.root.append(this.panel);

        this.minBtn.addEventListener('click', () => this.toggleMin());
        closeBtn.addEventListener('click', () => this.close());
        form.addEventListener('submit', (event) =>
        {
            event.preventDefault();
            void this.onSubmit();
        });

        uiBridge.addEventListener(BOT_SELECTED, (event: Event) =>
        {
            const { id } = (event as CustomEvent<{ id: BotId }>).detail;
            this.open(id);
        });
    }

    open (id: BotId): void
    {
        this.activeId = id;
        const bot = getBot(id);
        this.titleEl.textContent = bot.name;
        this.inputEl.placeholder = `Message ${bot.name}…`;
        this.dotEl.style.backgroundColor = colorToCss(bot.color);
        this.root.classList.add('is-open');
        this.setMinimized(false);
        this.renderThread(id);
        this.syncSendEnabled();
        this.inputEl.focus();
    }

    close (): void
    {
        this.root.classList.remove('is-open');
        this.activeId = null;
        uiBridge.closeChat();
    }

    private toggleMin (): void
    {
        this.setMinimized(!this.minimized);
    }

    private setMinimized (value: boolean): void
    {
        this.minimized = value;
        this.root.classList.toggle('is-minimized', value);
        this.panel.classList.toggle('is-minimized', value);
        this.minBtn.textContent = value ? '+' : '–';
        this.minBtn.setAttribute('aria-label', value ? 'Expand' : 'Minimize');
    }

    private ensureThread (id: BotId): ChatMessage[]
    {
        let thread = this.threads.get(id);

        if (!thread)
        {
            thread = [];
            this.threads.set(id, thread);
        }

        return thread;
    }

    private renderThread (id: BotId): void
    {
        const thread = this.ensureThread(id);
        this.logEl.replaceChildren();

        if (thread.length === 0)
        {
            this.emptyEl.textContent = `No messages yet. Say hi to ${getBot(id).name}.`;
            this.logEl.append(this.emptyEl);
            return;
        }

        for (const message of thread)
        {
            this.appendMessage(message);
        }

        this.scrollToEnd();
    }

    private appendMessage (message: ChatMessage): HTMLElement
    {
        const bubble = h('div', { class: `chat-msg chat-msg-${message.role}` });
        bubble.textContent = message.content;
        this.logEl.append(bubble);
        return bubble;
    }

    private async onSubmit (): Promise<void>
    {
        if (!this.activeId)
        {
            return;
        }

        const text = this.inputEl.value.trim();

        if (!text || this.inflight.has(this.activeId))
        {
            return;
        }

        const botId = this.activeId;
        this.inputEl.value = '';

        const history = this.ensureThread(botId);
        const userMsg: ChatMessage = { role: 'user', content: text };
        history.push(userMsg);

        if (this.logEl.contains(this.emptyEl))
        {
            this.emptyEl.remove();
        }

        this.appendMessage(userMsg);

        const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
        history.push(assistantMsg);
        const bubble = this.appendMessage(assistantMsg);
        this.scrollToEnd();

        this.inflight.add(botId);
        this.syncSendEnabled();

        try
        {
            for await (const chunk of streamChat({ botId, messages: history.slice(0, -1) }))
            {
                assistantMsg.content += chunk;

                if (this.activeId === botId)
                {
                    if (bubble.isConnected)
                    {
                        bubble.textContent = assistantMsg.content;
                    }
                    else
                    {
                        this.renderThread(botId);
                    }

                    this.scrollToEnd();
                }
            }
        }
        finally
        {
            this.inflight.delete(botId);
            this.syncSendEnabled();

            if (this.activeId === botId)
            {
                this.inputEl.focus();
            }
        }
    }

    private syncSendEnabled (): void
    {
        const blocked = this.activeId !== null && this.inflight.has(this.activeId);
        this.sendBtn.disabled = blocked;
    }

    private scrollToEnd (): void
    {
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }
}

function h<K extends keyof HTMLElementTagNameMap> (
    tag: K,
    attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K]
{
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs))
    {
        if (key === 'class')
        {
            node.className = value;
        }
        else
        {
            node.setAttribute(key, value);
        }
    }

    return node;
}

function colorToCss (color: number): string
{
    return `#${color.toString(16).padStart(6, '0')}`;
}
