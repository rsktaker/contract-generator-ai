import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  InferUITools,
  stepCountIs,
  streamText,
  UIDataTypes,
  UIMessage,
} from 'ai';
import { tools } from '../../../lib/tools';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export type ChatMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<typeof tools>
>;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array is required', { status: 400 });
    }

    const result = streamText({
      model: openai('gpt-4o'),
      messages: messages,
      system: `You are a professional contract lawyer with expertise in generating comprehensive, legally sound contracts.

Your capabilities include:
- Generating contract titles based on user requirements
- Creating detailed contract content with proper legal structure
- Extracting unknown variables that need to be filled in
- Formatting text professionally
- Using appropriate legal language and clauses

When generating contracts:
1. Always use clear, professional legal language
2. Include necessary legal clauses and protections
3. Use standard contract formatting with numbered sections
4. Use [BRACKETED] placeholders for information that needs to be filled in later
5. DO NOT include signature blocks - those are handled separately
6. Use **bold text** for section headings

Available tools:
- simpleTextTool: Format text in various ways (for testing)
- generateTitleTool: Create professional contract titles
- writeContractTool: Generate comprehensive contract content
- extractUnknownsTool: Find variables that need to be filled in

Use these tools when appropriate to help generate professional contracts. For contract generation, use the writeContractTool to create the main content, then use extractUnknownsTool to identify what needs to be filled in.`,
      stopWhen: stepCountIs(10), // Allow multi-step tool usage
      tools,
      temperature: 0.2,
    });

    return result.toUIMessageStreamResponse({
      onFinish: (options) => {
        console.log('Contract chat finished:', options);
      },
    });
  } catch (error) {
    console.error('Contract chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}