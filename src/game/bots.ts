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
        idleKey: 'blocky_ops_idle',
        talkKey: 'blocky_ops_talk',
        color: 0x3d7ea6,
    },
    {
        id: 'research',
        name: 'Research',
        idleKey: 'blocky_research_idle',
        talkKey: 'blocky_research_talk',
        color: 0x3d9a6a,
    },
    {
        id: 'build',
        name: 'Build',
        idleKey: 'blocky_build_idle',
        talkKey: 'blocky_build_talk',
        color: 0xc45c26,
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
