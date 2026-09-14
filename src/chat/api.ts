export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
    role: ChatRole;
    content: string;
};

export type ChatRequest = {
    botId: string;
    messages: ChatMessage[];
};

export type ChatReply = {
    content: string;
};

// Step 1 echoes locally. Later this becomes POST /api/chat (key stays on the server).
export async function sendChat (request: ChatRequest): Promise<ChatReply>
{
    const lastUser = findLastUser(request.messages);

    return { content: lastUser?.content ?? '' };
}

export async function* streamChat (request: ChatRequest): AsyncIterable<string>
{
    const { content } = await sendChat(request);

    if (content.length === 0)
    {
        return;
    }

    const chunkSize = 12;

    for (let i = 0; i < content.length; i += chunkSize)
    {
        yield content.slice(i, i + chunkSize);
        await wait(18);
    }
}

function findLastUser (messages: ChatMessage[]): ChatMessage | undefined
{
    for (let i = messages.length - 1; i >= 0; i -= 1)
    {
        if (messages[i].role === 'user')
        {
            return messages[i];
        }
    }

    return undefined;
}

function wait (ms: number): Promise<void>
{
    return new Promise((resolve) =>
    {
        window.setTimeout(resolve, ms);
    });
}
