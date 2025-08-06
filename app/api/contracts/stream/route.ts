import { openai } from '@ai-sdk/openai';
import {
  createUIMessageStreamResponse,
  streamText,
  createUIMessageStream,
  convertToModelMessages,
  stepCountIs,
} from 'ai';
import { tools } from '@/lib/tools';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  console.log('[STREAM-ROUTE] Received messages:', messages?.length);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      console.log('[STREAM-ROUTE] Starting stream with tools:', Object.keys(tools));

      const result = streamText({
        model: openai('gpt-4o'),
        messages: convertToModelMessages(messages),
        tools,
        stopWhen: stepCountIs(5),
        system: `You are a contract generation assistant.

CRITICAL RULE: When users request a contract, you MUST call writeContractTool FIRST.

When you see requests like "make an nda", "create a service agreement", "generate a contract", etc., immediately call writeContractTool.`,
      });

      writer.merge(
        result.toUIMessageStream({ originalMessages: messages }),
      );
    },
  });

  return createUIMessageStreamResponse({ stream });
}