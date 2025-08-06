import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const writeContractTool = tool({
  description: 'Generate complete contract text based on user requirements',
  inputSchema: z.object({ 
    contractType: z.string().describe('Type of contract (nda, service, custom, etc.)'),
    userPrompt: z.string().describe('User description of contract needs')
  }),
  execute: async ({ contractType, userPrompt }) => {
    console.log(`[WRITE-CONTRACT-TOOL] Generating ${contractType} contract for: ${userPrompt}`);
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    try {
      // Generate the contract dynamically using AI
      const result = await generateText({
        model: openai('gpt-4o'),
        system: `You are a contract generation expert. Generate a complete, legally sound contract.

FORMATTING REQUIREMENTS:
- Use **bold text** for all section headings
- Use numbered sections (1., 2., 3., etc.)
- Include proper legal language and structure
- Use [BRACKETED] placeholders for information that needs to be filled in
- Examples: [Your Name], [Company Name], [Date], [Amount], [Address], [Duration], [State], [Effective Date], [Payment Terms], [Other Party Name], [Recipient Name], [Deliverables], [Jurisdiction]
- START IMMEDIATELY with the contract title
- END with the last contract clause
- NO explanatory text before or after the contract
- Professional legal document formatting

Current Date: ${currentDate}
Contract Type: ${contractType}
User Requirements: ${userPrompt}`,
        prompt: `Generate a complete ${contractType} contract based on these requirements: ${userPrompt}

The contract should be professional, legally sound, and include all necessary clauses for this type of agreement. Use bracketed placeholders for specific information that would need to be filled in.`,
        temperature: 0.2,
      });

      console.log(`[WRITE-CONTRACT-TOOL] Generated contract length: ${result.text.length}`);
      return result.text;

    } catch (error) {
      console.error('[WRITE-CONTRACT-TOOL] Error generating contract:', error);
      throw error;
    }
  }
});