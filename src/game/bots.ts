export type BotId = 'ops' | 'research' | 'build';

export type BotDef = {
    id: BotId;
    name: string;
    idleKey: string;
    talkKey: string;
    color: number;
};

export const BOTS: readonly BotDef[] = [
    {
        id: 'ops',
        name: 'Ops',
        idleKey: 'tiny_ops_idle',
        talkKey: 'tiny_ops_talk',
        color: 0x6b7c8a,
    },
    {
        id: 'research',
        name: 'Research',
        idleKey: 'tiny_research_idle',
        talkKey: 'tiny_research_talk',
        color: 0x7a4fb0,
    },
    {
        id: 'build',
        name: 'Build',
        idleKey: 'tiny_build_idle',
        talkKey: 'tiny_build_talk',
        color: 0xb84a3a,
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
