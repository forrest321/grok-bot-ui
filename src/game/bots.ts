export type BotId = 'cos' | 'ops' | 'research' | 'build';

export type WorkerStatus = 'idle' | 'busy' | 'asleep';

export type BotDef = {
    id: BotId;
    name: string;
    idleKey: string;
    talkKey: string;
    color: number;
    talkable: boolean;
    /** Runtime worker state. Talkable bots leave this unset. */
    status?: WorkerStatus;
    busyIcon?: string;
};

export const ASLEEP_ICON = 'tiny_status_ghost';

export const BOTS: BotDef[] = [
    {
        id: 'cos',
        name: 'Chief of Staff',
        idleKey: 'tiny_cos_idle',
        talkKey: 'tiny_cos_talk',
        color: 0x3d5a80,
        talkable: true,
    },
    {
        id: 'ops',
        name: 'Ops',
        idleKey: 'tiny_ops_idle',
        talkKey: 'tiny_ops_talk',
        color: 0x6b7c8a,
        talkable: false,
        status: 'busy',
        busyIcon: 'tiny_status_shield',
    },
    {
        id: 'research',
        name: 'Research',
        idleKey: 'tiny_research_idle',
        talkKey: 'tiny_research_talk',
        color: 0x7a4fb0,
        talkable: false,
        status: 'asleep',
        busyIcon: 'tiny_status_potion',
    },
    {
        id: 'build',
        name: 'Build',
        idleKey: 'tiny_build_idle',
        talkKey: 'tiny_build_talk',
        color: 0xb84a3a,
        talkable: false,
        status: 'busy',
        busyIcon: 'tiny_status_hammer',
    },
];

export function getBot(id: BotId): BotDef
{
    const bot = BOTS.find((item) => item.id === id);

    if (!bot)
    {
        throw new Error(`Unknown bot: ${id}`);
    }

    return bot;
}

export function getTalkableBots(): BotDef[]
{
    return BOTS.filter((bot) => bot.talkable);
}

export function getWorkerBots(): BotDef[]
{
    return BOTS.filter((bot) => !bot.talkable);
}
