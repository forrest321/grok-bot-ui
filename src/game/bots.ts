export type BotId = 'cos' | 'foss' | 'randy' | 'redax' | 'photo';

export type WorkerStatus = 'idle' | 'busy' | 'asleep';

export type BotDef = {
    id: BotId;
    name: string;
    shortName: string;
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
        shortName: 'CoS',
        idleKey: 'tiny_cos_idle',
        talkKey: 'tiny_cos_talk',
        color: 0x3d5a80,
        talkable: true,
    },
    {
        id: 'foss',
        name: 'Foss',
        shortName: 'Foss',
        idleKey: 'tiny_foss_idle',
        talkKey: 'tiny_foss_talk',
        color: 0x7a4fb0,
        talkable: false,
        status: 'busy',
        busyIcon: 'tiny_status_potion',
    },
    {
        id: 'randy',
        name: 'Randy',
        shortName: 'Randy',
        idleKey: 'tiny_randy_idle',
        talkKey: 'tiny_randy_talk',
        color: 0x6b7c8a,
        talkable: false,
        status: 'idle',
        busyIcon: 'tiny_status_shield',
    },
    {
        id: 'redax',
        name: 'Redax',
        shortName: 'Redax',
        idleKey: 'tiny_redax_idle',
        talkKey: 'tiny_redax_talk',
        color: 0xb84a3a,
        talkable: false,
        status: 'busy',
        busyIcon: 'tiny_status_hammer',
    },
    {
        id: 'photo',
        name: 'Photo Desk',
        shortName: 'Photo',
        idleKey: 'tiny_photo_idle',
        talkKey: 'tiny_photo_talk',
        color: 0xc4a35a,
        talkable: false,
        status: 'asleep',
        busyIcon: 'tiny_status_potion_115',
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
