import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, contractJson, chatHistory, isInitialMessage, isAnalysis, isSummary, isRegenerationAnalysis, isRegenerationInitial } = await request.json();

    if (!message || !contractJson) {
      return NextResponse.json(
        { error: 'Message and contract data are required' },
        { status: 400 }
      );
    }

    let systemPrompt = '';

    if (isInitialMessage) {
      systemPrompt = `You are an AI contract agent. You have just generated a contract based on the user's requirements.

CRITICAL REQUIREMENTS:
1. Start with "I've drafted" and describe the contract you made in 1-2 sentences
2. Then say "In order to complete the contract I need you to fill in the unknowns:"
3. List the unknowns as a bulleted list with hyphens
4. Maximum 45 words total
5. Be concise and professional
6. Do NOT mention "PartyA" or "PartyB"
7. Do NOT request signatures or signature-related information

Current contract context:
${JSON.stringify(contractJson, null, 2)}

Example format: "I've drafted [brief description of contract]. In order to complete the contract I need you to fill in the unknowns:
- date
- names
- addresses"

Keep it under 45 words and focus on what was created.`;
    } else if (isAnalysis) {
      systemPrompt = `You are analyzing a user message to determine if they want to modify the contract.

Your task is to determine if the user is:
1. Providing new information that should be incorporated into the contract
2. Asking questions or seeking clarification
3. Making general comments

If the user is providing specific new information (names, dates, amounts, terms, etc.) that should be added to the contract, respond with shouldRegenerate: true.
If the user is just asking questions or making general comments, respond with shouldRegenerate: false.

Current contract context:
${JSON.stringify(contractJson, null, 2)}

Previous conversation context:
${chatHistory ? chatHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') : 'No previous conversation'}

CRITICAL: Return ONLY a JSON object with this exact structure, no other text or formatting:
{
  "shouldRegenerate": true/false,
  "reason": "brief explanation",
  "response": "your helpful response to the user"
}

Do not include any markdown, code blocks, or additional text. Just the raw JSON object.`;
    } else if (isRegenerationAnalysis) {
      systemPrompt = `You are analyzing a user message to determine if they want to regenerate the contract.

Your task is to determine if the user is:
1. Requesting changes that require regenerating the entire contract (new terms, structure changes, etc.)
2. Just asking questions or making minor edits

IMPORTANT: Consider the conversation context. If the AI just asked about regenerating to remove dismissed unknowns, and the user says "yes", that IS a regeneration request.

Return ONLY a JSON object with this exact structure:
{
  "shouldRegenerate": true/false,
  "reason": "brief explanation"
}

Examples of regeneration requests (shouldRegenerate: true):
- "remove section 2"
- "add a confidentiality clause"
- "change the payment terms"
- "make it a partnership agreement instead"
- "add termination conditions"
- "regenerate to remove section 2"
- "update the contract to include..."
- "modify the agreement to..."
- "change this to a..."
- "yes" (when AI just asked about regenerating to remove dismissed unknowns)
- "regenerate" (when AI just asked about regenerating)

Examples of non-regeneration requests (shouldRegenerate: false):
- "What does this clause mean?"
- "Can you explain this term?"
- "How do I fill in the unknowns?"
- "no" (when AI just asked about regenerating)
- "okay"
- "thanks"

Be strict - only regenerate if the user explicitly requests contract changes or agrees to regeneration.`;
    } else if (isRegenerationInitial) {
      systemPrompt = `You are generating a brief, conversational response to a user's contract modification request.

Your task is to respond naturally to what the user wants to change in their contract.

Current contract context:
${JSON.stringify(contractJson, null, 2)}

CRITICAL REQUIREMENTS:
1. Be conversational and natural, not robotic
2. Keep it brief (max 20 words)
3. Acknowledge what they want to do
4. Use phrases like "Got it, I'll..." or "Sure, I'll..." or "I'll..."
5. Don't repeat their exact words back to them
6. Be friendly and helpful

Examples:
- User: "remove section 2" → "Got it, I'll remove that section."
- User: "reorder the numbers" → "Sure, I'll reorder the section numbers."
- User: "add a confidentiality clause" → "I'll add a confidentiality clause to the contract."
- User: "make it shorter" → "Got it, I'll make the contract more concise."

Be natural and conversational, not formal or robotic.`;
    } else if (isSummary) {
      systemPrompt = `You are providing a brief summary of contract changes.

Your task is to summarize what was added or changed in the contract based on the user's request.

Current contract context:
${JSON.stringify(contractJson, null, 2)}

Provide a concise summary (max 100 words, 50 if possible for brevity) focusing on:
- What new information was added
- What sections were improved
- Key changes made to the contract

Be specific and helpful. Focus on the most important changes.

Say something like: "I've done ..., in order to complete the contract I need you to provide: [bulleted list of unknowns]"
If there are no unknowns in the list, do not say anything like this.
Essentially, if no unknowns are listed, do not mention anything about the unknowns.

Do NOT request signatures or signature dates, that is already communicated to the user. Image URLS and signed names do NOT need to be requested, as their absence is already communicated to the user.`;
    } else {
      systemPrompt = `You are an AI contract assistant helping users improve their contracts. 

Your role is to:
1. Answer questions about the contract
2. Suggest improvements
3. Explain legal terms
4. Help users understand what information they need to provide
5. Guide them on how to modify the contract

Current contract context:
${JSON.stringify(contractJson, null, 2)}

Previous conversation context:
${chatHistory ? chatHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') : 'No previous conversation'}

Be helpful, professional, and concise. If the user wants to modify the contract, suggest they provide specific information that can be incorporated.

Respond in a friendly, conversational tone.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: isAnalysis ? 300 : isSummary ? 150 : 800,
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}