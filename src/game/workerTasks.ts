import { getBot, getWorkerBots, type BotId, type WorkerStatus } from './bots';

export type WorkerId = Exclude<BotId, 'cos'>;

export type WorkerTask = {
    taskLabel: string;
    startedAt: number;
    durationMs: number;
};

const TASK_MIN_MS = 45_000;
const TASK_MAX_MS = 120_000;

const TASK_LABELS: Record<WorkerId, string[]> = {
    ops: [
        'Holding the perimeter',
        'Checking the watch rotation',
        'Locking down the east wing',
    ],
    research: [
        'Deep dive on competitors',
        'Reading last night’s notes',
        'Chasing a lead in the archives',
    ],
    build: [
        'Shipping HQ polish',
        'Patching the north wall',
        'Tuning the workshop bench',
    ],
};

const tasks = new Map<BotId, WorkerTask>();
const asleepAt = new Map<BotId, number>();

export function isWorkerId (id: BotId): id is WorkerId
{
    return id !== 'cos';
}

export function initWorkerTasks (now = Date.now()): void
{
    tasks.clear();
    asleepAt.clear();

    for (const bot of getWorkerBots())
    {
        applyWorkerStatusChange(bot.id, bot.status ?? 'idle', now);
    }
}

export function applyWorkerStatusChange (
    id: BotId,
    status: WorkerStatus,
    now = Date.now(),
): void
{
    if (!isWorkerId(id))
    {
        return;
    }

    if (status === 'busy')
    {
        asleepAt.delete(id);
        tasks.set(id, createTask(id, now));
        return;
    }

    tasks.delete(id);

    if (status === 'asleep')
    {
        if (!asleepAt.has(id))
        {
            asleepAt.set(id, now);
        }

        return;
    }

    asleepAt.delete(id);
}

export function getWorkerTask (id: BotId): WorkerTask | undefined
{
    return tasks.get(id);
}

export function getAsleepSince (id: BotId): number | undefined
{
    return asleepAt.get(id);
}

export function elapsedMs (task: WorkerTask, now = Date.now()): number
{
    return Math.max(0, now - task.startedAt);
}

export function remainingMs (task: WorkerTask, now = Date.now()): number
{
    return Math.max(0, task.durationMs - elapsedMs(task, now));
}

export function formatDuration (ms: number): string
{
    const seconds = Math.max(0, Math.floor(ms / 1000));

    if (seconds < 60)
    {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;

    return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export type WorkerStatusCopy = {
    name: string;
    color: number;
    status: WorkerStatus;
    headline: string;
    taskLabel: string | null;
    elapsedLabel: string | null;
    remainingLabel: string | null;
    hint: string | null;
    asleepSinceLabel: string | null;
};

export function describeWorker (id: BotId, now = Date.now()): WorkerStatusCopy
{
    const bot = getBot(id);
    const status = bot.status ?? 'idle';
    const name = bot.name;
    const base = {
        name,
        color: bot.color,
        status,
        taskLabel: null,
        elapsedLabel: null,
        remainingLabel: null,
        hint: null,
        asleepSinceLabel: null,
    };

    if (status === 'busy')
    {
        const task = getWorkerTask(id);

        return {
            ...base,
            headline: name,
            taskLabel: task?.taskLabel ?? 'On assignment',
            elapsedLabel: formatDuration(task ? elapsedMs(task, now) : 0),
            remainingLabel: formatDuration(task ? remainingMs(task, now) : 0),
        };
    }

    if (status === 'asleep')
    {
        const since = getAsleepSince(id);

        return {
            ...base,
            headline: `${name} is asleep`,
            hint: 'Ask Chief of Staff to wake them',
            asleepSinceLabel: since === undefined
                ? null
                : formatDuration(Math.max(0, now - since)),
        };
    }

    return {
        ...base,
        headline: name,
        hint: `${name} is free — ask Chief of Staff to assign work.`,
    };
}

function createTask (id: WorkerId, now: number): WorkerTask
{
    const labels = TASK_LABELS[id];

    return {
        taskLabel: labels[Math.floor(Math.random() * labels.length)],
        startedAt: now,
        durationMs: TASK_MIN_MS + Math.floor(Math.random() * (TASK_MAX_MS - TASK_MIN_MS + 1)),
    };
}
