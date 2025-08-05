import { tool } from 'ai';
import { z } from 'zod';

/**
 * Contract title generation tool
 */
export const generateTitleTool = tool({
  description: 'Generate a professional contract title based on user requirements',
  inputSchema: z.object({
    userPrompt: z.string().describe('User description of the contract they need'),
    contractType: z.enum(['service', 'nda', 'employment', 'lease', 'custom']).optional().describe('Type of contract if known')
  }),
  execute: async ({ userPrompt, contractType }) => {
    // Simple title generation logic for testing
    const keywords = userPrompt.toLowerCase();
    let title = 'CONTRACT AGREEMENT';
    
    // Basic keyword matching for different contract types
    if (keywords.includes('service') || keywords.includes('freelance') || keywords.includes('consulting')) {
      title = 'SERVICE AGREEMENT';
    } else if (keywords.includes('nda') || keywords.includes('confidential') || keywords.includes('non-disclosure')) {
      title = 'NON-DISCLOSURE AGREEMENT';
    } else if (keywords.includes('employment') || keywords.includes('job') || keywords.includes('hire')) {
      title = 'EMPLOYMENT CONTRACT';
    } else if (keywords.includes('lease') || keywords.includes('rent') || keywords.includes('property')) {
      title = 'LEASE AGREEMENT';
    } else if (contractType) {
      title = `${contractType.toUpperCase()} AGREEMENT`;
    }
    
    return {
      success: true,
      title: title,
      contractType: contractType || 'custom',
      basedOnKeywords: keywords.includes('service') || keywords.includes('nda') || keywords.includes('employment') || keywords.includes('lease'),
      timestamp: new Date().toISOString(),
      message: `Generated title: "${title}"`
    };
  }
});