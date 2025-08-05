import { tool } from 'ai';
import { z } from 'zod';

/**
 * Extract unknown variables from contract text that need to be filled in
 * This replaces the complex AI-based extraction from the old implementation
 */
export const extractUnknownsTool = tool({
  description: 'Extract unknown variables from contract text that need to be filled in by the user',
  inputSchema: z.object({
    contractText: z.string().describe('The contract text to analyze'),
    includePositions: z.boolean().default(false).describe('Whether to include position information for UI highlighting')
  }),
  execute: async ({ contractText, includePositions }) => {
    const unknowns: Array<{
      text: string;
      category: string;
      position?: { start: number; end: number };
    }> = [];
    
    // Find [bracketed] content
    const bracketPattern = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = bracketPattern.exec(contractText)) !== null) {
      const unknownText = match[1].trim();
      const category = categorizeUnknown(unknownText);
      
      const unknown: any = {
        text: unknownText,
        category
      };
      
      if (includePositions) {
        unknown.position = {
          start: match.index,
          end: match.index + match[0].length
        };
      }
      
      // Avoid duplicates
      if (!unknowns.find(u => u.text === unknownText)) {
        unknowns.push(unknown);
      }
    }
    
    // Sort by category for better organization
    unknowns.sort((a, b) => {
      const categoryOrder = ['party', 'date', 'money', 'location', 'time', 'other'];
      return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    });
    
    return {
      success: true,
      unknowns,
      totalFound: unknowns.length,
      categories: [...new Set(unknowns.map(u => u.category))],
      message: `Found ${unknowns.length} unknown variables that need to be filled in`
    };
  }
});

/**
 * Categorize unknown variables for better UI organization
 */
function categorizeUnknown(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Party information
  if (lowerText.includes('name') || lowerText.includes('client') || lowerText.includes('company') || 
      lowerText.includes('employer') || lowerText.includes('employee') || lowerText.includes('landlord') || 
      lowerText.includes('tenant') || lowerText.includes('party')) {
    return 'party';
  }
  
  // Date information
  if (lowerText.includes('date') || lowerText.includes('start') || lowerText.includes('end') || 
      lowerText.includes('completion') || lowerText.includes('deadline')) {
    return 'date';
  }
  
  // Money/financial information
  if (lowerText.includes('amount') || lowerText.includes('salary') || lowerText.includes('rent') || 
      lowerText.includes('fee') || lowerText.includes('cost') || lowerText.includes('price') || 
      lowerText.includes('payment') || lowerText.includes('$')) {
    return 'money';
  }
  
  // Location information
  if (lowerText.includes('address') || lowerText.includes('location') || lowerText.includes('jurisdiction') || 
      lowerText.includes('state') || lowerText.includes('city') || lowerText.includes('country')) {
    return 'location';
  }
  
  // Time/duration information
  if (lowerText.includes('duration') || lowerText.includes('period') || lowerText.includes('hours') || 
      lowerText.includes('days') || lowerText.includes('weeks') || lowerText.includes('months') || 
      lowerText.includes('years') || lowerText.includes('schedule')) {
    return 'time';
  }
  
  // Default category
  return 'other';
}