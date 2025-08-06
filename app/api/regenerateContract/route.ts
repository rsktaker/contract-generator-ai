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
    console.log('[REGENERATE] Calling contractAgent.generateContract with prompt:', prompt);
    const result = await contractAgent.generateContract(prompt, { 
      isAnonymous: true,
      userName: 'Contract User'
    });

    console.log('[REGENERATE] Agent result:');
    console.log('- Text length:', result.text?.length || 0);
    console.log('- Tool calls count:', result.toolCalls?.length || 0);
    console.log('- Tool results count:', result.toolResults?.length || 0);
    
    if (result.toolResults && result.toolResults.length > 0) {
      console.log('[REGENERATE] Tool results:');
      result.toolResults.forEach((tr, index) => {
        console.log(`- Tool ${index}:`, {
          toolName: tr.toolName,
          resultType: typeof tr.result,
          result: typeof tr.result === 'object' ? JSON.stringify(tr.result, null, 2) : tr.result
        });
      });
    }

    // Extract the contract content from tool results instead of AI text
    let regeneratedText = result.text;
    
    // Check if writeContractTool was used and extract its result
    if (result.toolResults && result.toolResults.length > 0) {
      const contractTool = result.toolResults.find(tool => 
        tool.toolName === 'writeContractTool' && tool.result && typeof tool.result === 'object'
      );
      
      if (contractTool && contractTool.result) {
        const toolResult = contractTool.result as any;
        regeneratedText = toolResult.content || regeneratedText;
        console.log('[REGENERATE] Using writeContractTool result. Content length:', regeneratedText?.length || 0);
        console.log('[REGENERATE] First 200 chars:', regeneratedText?.substring(0, 200) + '...');
      } else {
        console.log('[REGENERATE] No writeContractTool result found, using AI text response');
        console.log('[REGENERATE] AI text response length:', regeneratedText?.length || 0);
      }
    }

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