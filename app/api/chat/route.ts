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
      system: `🔥 IMMEDIATE ACTION REQUIRED: You are a professional contract generation assistant.

CRITICAL RULE: On ANY contract request (like "create an NDA", "make a service agreement", "generate a contract"), you MUST IMMEDIATELY call writeContractTool FIRST before any chat response.

🎯 IMMEDIATE TOOL USAGE PROTOCOL:
1. User requests contract → INSTANTLY call writeContractTool 
2. Tool generates complete contract → Goes to left document display
3. You provide helpful follow-up response → Goes to right chat panel

📝 POST-TOOL RESPONSE TEMPLATE:
After the writeContractTool executes, immediately provide guidance like:

"I've created a provisional [CONTRACT_TYPE] for you! To personalize it with your information:

**Party Details:**
- Who are the parties? (replace [Your Name] and [Other Party Name])
- Business addresses and contact information

**Key Information:**  
- Important dates: [Effective Date], [Duration], [Expiration Date]
- Financial terms: [Amount], [Payment Terms]
- Specific details: [Deliverables], [State/Jurisdiction]

Just provide these details and I'll update the contract immediately using the tool again!"

🔧 EDITING PROTOCOL:
- When user provides specific information to replace bracketed placeholders, IMMEDIATELY call writeContractTool again
- When user requests changes or modifications, IMMEDIATELY call writeContractTool again
- Remove brackets from user-provided information when updating contracts
- Always use the tool for ANY contract modifications

💬 CHAT RESPONSE RULES:
- Brief, helpful, conversational responses only
- Guide users through completing placeholder information
- Ask clarifying questions when needed
- NEVER include contract content in chat responses
- Keep responses focused on next steps and guidance

The writeContractTool handles ALL contract generation and editing. Your job is immediate tool usage and helpful user guidance.`,
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