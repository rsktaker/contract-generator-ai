import { NextRequest, NextResponse } from 'next/server';
import { tools } from '@/lib/tools';

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

    // Use writeContractTool directly
    console.log('[REGENERATE] Calling writeContractTool with prompt:', prompt);
    
    // Determine contract type
    const contractType = prompt.toLowerCase().includes('nda') ? 'nda' : 
                        prompt.toLowerCase().includes('service') ? 'service' : 'custom';
    
    if (!tools.writeContractTool || !tools.writeContractTool.execute) {
      throw new Error('writeContractTool is not available');
    }
    
    const generatedContract = await tools.writeContractTool.execute(
      {
        contractType,
        userPrompt: prompt
      },
      {
        toolCallId: '',
        messages: []
      } // Provide an empty options object or appropriate options
    );

    // Use the direct tool result
    const cleanedText = generatedContract.replace(/\[End of Document\]/gi, '').trim();
    console.log('[REGENERATE] Regenerated contract length:', cleanedText.length);

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