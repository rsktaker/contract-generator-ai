import { NextRequest, NextResponse } from 'next/server';
import { tools } from '@/lib/tools';

interface Signature {
  party: string;
  img_url: string;
  index: number;
}

interface ContractBlock {
  text: string;
  signatures: Signature[];
}

interface ContractJson {
  blocks: ContractBlock[];
  unknowns: string[];
  assessment: string;
  title?: string;
  type?: string;
  parties?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractJson, blockIndex, userPrompt } = body;

    // Validate required fields
    if (!contractJson || typeof blockIndex !== 'number' || !userPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: contractJson, blockIndex, and userPrompt are required' },
        { status: 400 }
      );
    }

    // Validate blockIndex
    if (blockIndex < 0 || blockIndex >= contractJson.blocks.length) {
      return NextResponse.json(
        { error: 'Invalid blockIndex' },
        { status: 400 }
      );
    }

    // Regenerate the specific block using the new contract agent
    console.log('Regenerating block with agent:', {
      blockIndex,
      userPrompt,
      blocksCount: contractJson.blocks.length
    });
    
    // Use writeContractTool directly
    const prompt = `Regenerate block ${blockIndex} of this contract based on user instructions: ${userPrompt}
      
Current contract: ${JSON.stringify(contractJson, null, 2)}`;

    const contractType = prompt.toLowerCase().includes('nda') ? 'nda' : 
                        prompt.toLowerCase().includes('service') ? 'service' : 'custom';
    
    if (!tools.writeContractTool || !tools.writeContractTool.execute) {
      throw new Error('writeContractTool is not available');
    }

    const regeneratedContent = await tools.writeContractTool.execute(
      {
        contractType,
        userPrompt: prompt
      },
      {
        toolCallId: '',
        messages: []
      } // Provide an empty options object or appropriate options
    );

    // Update the specific block with the new content
    const updatedContractJson = {
      ...contractJson,
      blocks: contractJson.blocks.map((block: any, index: number) =>
        index === blockIndex ? { ...block, text: regeneratedContent } : block
      )
    };

    console.log('Block regeneration completed:', {
      hasBlocks: !!updatedContractJson?.blocks,
      blocksCount: updatedContractJson?.blocks?.length,
      regeneratedBlock: blockIndex
    });

    // Validate the result before sending
    if (!updatedContractJson || !updatedContractJson.blocks || !Array.isArray(updatedContractJson.blocks)) {
      console.error('Invalid result from regenerateBlockJson:', updatedContractJson);
      return NextResponse.json(
        { error: 'AI service returned invalid data structure' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedContractJson, { status: 200 });

  } catch (error) {
    console.error('Error regenerating block:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate block' },
      { status: 500 }
    );
  }
} 