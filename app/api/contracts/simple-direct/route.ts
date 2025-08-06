import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { tools } from '@/lib/tools-simple';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  console.log('[SIMPLE-DIRECT] Received prompt:', prompt);
  console.log('[SIMPLE-DIRECT] Available tools:', Object.keys(tools));

  try {
    const result = streamText({
      model: openai('gpt-4o'),
      prompt: prompt,
      tools: tools,
      system: `You are a contract generation assistant.

When users request a contract, you MUST call writeContractTool.

When you see requests like "make an nda", "create a service agreement", "generate a contract", etc., immediately call writeContractTool.`,
      onError: (error) => {
        console.error('[SIMPLE-DIRECT] Error during streaming:', error);
      },
    });

    console.log('[SIMPLE-DIRECT] Created streamText, setting up handlers...');

    // Log when stream finishes (no onFinish method on streamText result)
    console.log('[SIMPLE-DIRECT] StreamText result created successfully');

    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error('[SIMPLE-DIRECT] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}