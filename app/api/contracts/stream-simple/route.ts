import { openai } from '@ai-sdk/openai';
import {
  createUIMessageStreamResponse,
  streamText,
  createUIMessageStream,
  convertToModelMessages,
  stepCountIs,
} from 'ai';
import { tools } from '@/lib/tools-simple';
import { HumanInTheLoopUIMessage } from '@/lib/types-simple';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  console.log('[STREAM-SIMPLE] Received messages:', messages?.length);
  console.log('[STREAM-SIMPLE] Raw messages:', JSON.stringify(messages, null, 2));
  console.log('[STREAM-SIMPLE] Available tools:', Object.keys(tools));

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      console.log('[STREAM-SIMPLE] Starting streamText...');
      
      const result = streamText({
        model: openai('gpt-4o'),
        messages: convertToModelMessages(messages),
        tools,
        stopWhen: stepCountIs(5),
        system: `You are a contract generation assistant.

When users request a contract, you MUST call writeContractTool.

When you see requests like "make an nda", "create a service agreement", "generate a contract", etc., immediately call writeContractTool.`,
        onError: (error) => {
          console.error('[STREAM-SIMPLE] Error during streaming:', error);
        },
      });

      console.log('[STREAM-SIMPLE] Created streamText, setting up handlers...');

      // Add logging to see what's happening  
      result.onFinish((finalResult) => {
        console.log('[STREAM-SIMPLE] Stream finished:', {
          text: finalResult.text,
          steps: finalResult.steps?.length || 0,
          toolCalls: finalResult.toolCalls?.length || 0,
          toolResults: finalResult.toolResults?.length || 0,
          finishReason: finalResult.finishReason
        });

        // Log each step
        finalResult.steps?.forEach((step, index) => {
          console.log(`[STREAM-SIMPLE] Step ${index}:`, {
            text: step.text?.substring(0, 100) + '...',
            toolCalls: step.toolCalls?.length || 0,
            toolResults: step.toolResults?.length || 0,
          });
          
          step.toolResults?.forEach((toolResult, i) => {
            console.log(`[STREAM-SIMPLE] Step ${index} Tool Result ${i}:`, {
              toolName: toolResult.toolName,
              result: typeof toolResult.result === 'string' 
                ? toolResult.result.substring(0, 200) + '...'
                : toolResult.result
            });
          });
        });
      });

      console.log('[STREAM-SIMPLE] Merging stream...');
      writer.merge(
        result.toUIMessageStream({ originalMessages: messages }),
      );
      console.log('[STREAM-SIMPLE] Stream merged successfully');
    },
  });

  return createUIMessageStreamResponse({ stream });
}