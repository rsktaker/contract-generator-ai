import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { contractId, contractJson, userInstructions, dismissedUnknowns } = await request.json();

    if (!contractJson || !userInstructions) {
      return NextResponse.json(
        { error: 'Contract data and user instructions are required' },
        { status: 400 }
      );
    }

    // Regenerate contract based on user instructions
    let systemPrompt = `You are a professional contract lawyer. Regenerate the contract based on the user's instructions.

CRITICAL REQUIREMENTS:
1. Write in clear, professional legal language
2. Include all necessary legal clauses and protections
3. Use standard contract formatting with clear sections and numbered clauses where appropriate
4. Do NOT include any concluding statements, ending phrases like [End of Document], or final clauses like "IN WITNESS WHEREOF..."
5. Do NOT include signature blocks - those will be added separately
6. Be extremely comfortable requesting information by explicitly bracketing unknowns (eg. [Date], [Amount], [Name], [Email], etc.). Do not create information that is not included in the user prompt.
7. Do NOT include a title at the beginning - the title is handled separately
8. Use **bold text** for section headings
9. Focus on the meat of the contract - the actual terms and conditions
10. Do NOT end with phrases like "[End of Document]", "END OF CONTRACT", or any similar concluding statements
11. The contract should end naturally with the last clause, no additional text

FORBIDDEN ENDINGS:
- "[End of Document]"
- "END OF CONTRACT"
- "IN WITNESS WHEREOF"
- Any concluding statements
- Any signature-related text

The contract must end with the last substantive clause, period.`;

    // If dismissed unknowns are provided, modify the prompt to remove them
    if (dismissedUnknowns && dismissedUnknowns.length > 0) {
      systemPrompt += `

IMPORTANT: The user has dismissed the following unknowns and wants them removed from the contract:
${dismissedUnknowns.map((unknown: string) => `- ${unknown}`).join('\n')}

Please regenerate the contract WITHOUT these unknowns. Remove any sections or clauses that reference these dismissed unknowns. Do not include them in the new contract.`;
    }

    systemPrompt += `

User instructions: ${userInstructions}

Current contract context:
${JSON.stringify(contractJson, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInstructions }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const regeneratedText = completion.choices[0]?.message?.content?.trim() || '';

    // Remove [End of Document] if it appears
    const cleanedText = regeneratedText.replace(/\[End of Document\]/gi, '').trim();

    // Update the contract with regenerated content
    const updatedContractJson = {
      ...contractJson,
      blocks: contractJson.blocks.map((block: any, index: number) =>
        index === 0 ? { ...block, text: cleanedText } : block
      )
    };

    return NextResponse.json({ 
      contractJson: updatedContractJson,
      message: 'Contract regenerated successfully'
    });

  } catch (error) {
    console.error('Error regenerating contract:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate contract' },
      { status: 500 }
    );
  }
} 