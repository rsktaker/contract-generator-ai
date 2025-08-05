import { NextRequest, NextResponse } from 'next/server';
import { contractAgent } from '@/lib/agent';

export async function POST(request: NextRequest) {
  try {
    const { contractId, contractJson, userInstructions, dismissedUnknowns } = await request.json();

    if (!contractJson || !userInstructions) {
      return NextResponse.json(
        { error: 'Contract data and user instructions are required' },
        { status: 400 }
      );
    }

    // Build prompt for the new contract agent
    let prompt = `Regenerate this contract based on user instructions: ${userInstructions}

Current contract: ${JSON.stringify(contractJson, null, 2)}`;

    if (dismissedUnknowns && dismissedUnknowns.length > 0) {
      prompt += `

IMPORTANT: Remove these dismissed unknowns from the contract:
${dismissedUnknowns.map((unknown: string) => `- ${unknown}`).join('\n')}`;
    }

    // Use the new contract agent
    const result = await contractAgent.generateContract(prompt, { 
      isAnonymous: true,
      userName: 'Contract User'
    });

    const regeneratedText = result.text;

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