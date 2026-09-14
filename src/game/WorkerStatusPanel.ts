import { getBot, type BotId } from './bots';
import { BOT_SELECTED, WORKER_INSPECTED, uiBridge } from './uiBridge';
import { describeWorker } from './workerTasks';

const AUTO_HIDE_MS = 6000;
const TICK_MS = 1000;
const OUTSIDE_CLICK_GRACE_MS = 120;

export class WorkerStatusPanel
{
    private readonly root: HTMLElement;
    private readonly panel: HTMLElement;
    private readonly dotEl: HTMLElement;
    private readonly titleEl: HTMLElement;
    private readonly badgeEl: HTMLElement;
    private readonly taskEl: HTMLElement;
    private readonly timesEl: HTMLElement;
    private readonly elapsedEl: HTMLElement;
    private readonly remainingEl: HTMLElement;
    private readonly asleepEl: HTMLElement;
    private readonly hintEl: HTMLElement;

    private activeId: BotId | null = null;
    private openedAt = 0;
    private hideTimer: number | null = null;
    private tickTimer: number | null = null;

    constructor (root: HTMLElement)
    {
        this.root = root;
        this.root.classList.add('status-root');
        this.root.setAttribute('aria-hidden', 'true');

        this.panel = h('div', {
            class: 'status-panel',
            role: 'status',
            'aria-live': 'polite',
        });

        const header = h('header', { class: 'status-header' });
        this.dotEl = h('span', { class: 'status-dot' });
        this.titleEl = h('h2', { class: 'status-title' });
        this.badgeEl = h('span', { class: 'status-badge' });
        header.append(this.dotEl, this.titleEl, this.badgeEl);

        this.taskEl = h('p', { class: 'status-task' });
        this.timesEl = h('dl', { class: 'status-times' });

        const elapsedWrap = h('div', {});
        const elapsedDt = h('dt', {});
        elapsedDt.textContent = 'Elapsed';
        this.elapsedEl = h('dd', {});
        elapsedWrap.append(elapsedDt, this.elapsedEl);

        const remainingWrap = h('div', {});
        const remainingDt = h('dt', {});
        remainingDt.textContent = 'Remaining';
        this.remainingEl = h('dd', {});
        remainingWrap.append(remainingDt, this.remainingEl);

        this.timesEl.append(elapsedWrap, remainingWrap);

        this.asleepEl = h('p', { class: 'status-meta' });
        this.hintEl = h('p', { class: 'status-hint' });

        this.panel.append(header, this.taskEl, this.timesEl, this.asleepEl, this.hintEl);
        this.root.append(this.panel);

        uiBridge.addEventListener(WORKER_INSPECTED, (event: Event) =>
        {
            const { id } = (event as CustomEvent<{ id: BotId }>).detail;
            this.open(id);
        });

        uiBridge.addEventListener(BOT_SELECTED, () => this.close());

        document.addEventListener('pointerdown', (event) => this.onDocumentPointerDown(event));
        window.addEventListener('keydown', (event) => this.onKeyDown(event));
    }

    open (id: BotId): void
    {
        if (getBot(id).talkable)
        {
            return;
        }

        this.activeId = id;
        this.openedAt = Date.now();
        this.root.classList.add('is-open');
        this.root.setAttribute('aria-hidden', 'false');
        this.render();
        this.startTick();
        this.armAutoHide();
    }

    close (): void
    {
        if (!this.activeId && !this.root.classList.contains('is-open'))
        {
            return;
        }

        this.activeId = null;
        this.root.classList.remove('is-open');
        this.root.setAttribute('aria-hidden', 'true');
        this.stopTick();
        this.clearAutoHide();
    }

    private render (): void
    {
        if (!this.activeId)
        {
            return;
        }

        const copy = describeWorker(this.activeId);
        this.titleEl.textContent = copy.headline;
        this.dotEl.style.backgroundColor = colorToCss(copy.color);
        this.badgeEl.textContent = badgeLabel(copy.status);
        this.badgeEl.dataset.status = copy.status;

        if (copy.taskLabel)
        {
            this.taskEl.textContent = copy.taskLabel;
            this.taskEl.hidden = false;
        }
        else
        {
            this.taskEl.textContent = '';
            this.taskEl.hidden = true;
        }

        if (copy.elapsedLabel !== null && copy.remainingLabel !== null)
        {
            this.elapsedEl.textContent = copy.elapsedLabel;
            this.remainingEl.textContent = copy.remainingLabel;
            this.timesEl.hidden = false;
        }
        else
        {
            this.timesEl.hidden = true;
        }

        if (copy.asleepSinceLabel)
        {
            this.asleepEl.textContent = `Asleep since ${copy.asleepSinceLabel}`;
            this.asleepEl.hidden = false;
        }
        else
        {
            this.asleepEl.textContent = '';
            this.asleepEl.hidden = true;
        }

        if (copy.hint)
        {
            this.hintEl.textContent = copy.hint;
            this.hintEl.hidden = false;
        }
        else
        {
            this.hintEl.textContent = '';
            this.hintEl.hidden = true;
        }
    }

    private startTick (): void
    {
        this.stopTick();
        this.tickTimer = window.setInterval(() => this.render(), TICK_MS);
    }

    private stopTick (): void
    {
        if (this.tickTimer !== null)
        {
            window.clearInterval(this.tickTimer);
            this.tickTimer = null;
        }
    }

    private armAutoHide (): void
    {
        this.clearAutoHide();
        this.hideTimer = window.setTimeout(() => this.close(), AUTO_HIDE_MS);
    }

    private clearAutoHide (): void
    {
        if (this.hideTimer !== null)
        {
            window.clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }

    private onDocumentPointerDown (event: PointerEvent): void
    {
        if (!this.root.classList.contains('is-open'))
        {
            return;
        }

        if (Date.now() - this.openedAt < OUTSIDE_CLICK_GRACE_MS)
        {
            return;
        }

        const target = event.target;

        if (target instanceof Node && this.panel.contains(target))
        {
            return;
        }

        this.close();
    }

    private onKeyDown (event: KeyboardEvent): void
    {
        if (event.key !== 'Escape' || !this.root.classList.contains('is-open'))
        {
            return;
        }

        event.preventDefault();
        this.close();
    }
}

function badgeLabel (status: string): string
{
    if (status === 'busy')
    {
        return 'Busy';
    }

    if (status === 'asleep')
    {
        return 'Asleep';
    }

    return 'Idle';
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
