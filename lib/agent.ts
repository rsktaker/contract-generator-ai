import { openai } from '@ai-sdk/openai';
import {
  createUIMessageStreamResponse,
  streamText,
  createUIMessageStream,
  convertToModelMessages,
  stepCountIs,
} from 'ai';
import { processToolCalls } from './utils';
import { tools } from './tools';
import { HumanInTheLoopUIMessage } from './types';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: HumanInTheLoopUIMessage[] } =
    await req.json();

  console.log('[AGENT] Received messages:', messages?.length);
  console.log('[AGENT] Available tools:', Object.keys(tools));

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Process any tool calls that require human confirmation
      const processedMessages = await processToolCalls(
        {
          messages,
          writer,
          tools,
        },
        {
          // No tools require confirmation currently - writeContractTool has execute function
        },
      );

      const result = streamText({
        model: openai('gpt-4o'),
        messages: convertToModelMessages(processedMessages),
        tools,
        stopWhen: stepCountIs(5),
        system: `You are a contract generation assistant.

CRITICAL RULE: When users request a contract, you MUST call writeContractTool FIRST.

When you see requests like "make an nda", "create a service agreement", "generate a contract", etc., immediately call writeContractTool with:
- contractType: determined from the user's request
- userPrompt: the user's specific requirements

The writeContractTool will generate a complete contract dynamically based on the user's needs.`,
      });

      writer.merge(
        result.toUIMessageStream({ originalMessages: processedMessages }),
      );
    },
  });

  return createUIMessageStreamResponse({ stream });
}