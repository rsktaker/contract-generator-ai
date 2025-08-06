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
      system: `CRITICAL INSTRUCTIONS: You are a contract lawyer with a STRICT separation of duties:

🔥 TOOL USAGE RULES (MANDATORY):
1. When user requests a contract, IMMEDIATELY use writeContractTool 
2. The writeContractTool result goes DIRECTLY to the left document display
3. You ONLY provide conversational responses in the chat (right side)
4. NEVER describe what the tool will do - just use it silently
5. NEVER say "Here's your contract" or similar introductory phrases
6. Keep chat responses brief and conversational

CONTRACT GENERATION PROTOCOL:
- Step 1: Immediately call writeContractTool when user requests a contract
- Step 2: The tool handles ALL contract formatting and content
- Step 3: You only provide brief chat responses like "I've generated your NDA. You can review it on the left and let me know if you need any changes."

PLACEHOLDER REQUIREMENTS:
- Use [Your Name], [Other Party Name], [Company Name], [Date], [Amount], [Address], [Duration], [State/Jurisdiction]
- Format: Dear [Recipient Name], between [Party 1 Name] and [Party 2 Name]
- Include [Effective Date], [Expiration Date], [Payment Terms], [Deliverables]

FORMATTING REQUIREMENTS:
- **Bold headings** for sections
- Numbered sections (1., 2., 3.)
- Professional legal language
- No signature blocks (handled separately)
- Use proper contract structure with parties, terms, obligations

CHAT RESPONSES (Right Side Only):
- Brief acknowledgments
- Questions for clarification
- Helpful suggestions
- Status updates
- NO CONTRACT CONTENT in chat responses

The writeContractTool will handle ALL contract generation. Your job is conversational support only.`,
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