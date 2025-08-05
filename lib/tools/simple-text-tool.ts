import { tool } from 'ai';
import { z } from 'zod';

/**
 * Simple text formatting tool for testing AI SDK integration
 */
export const simpleTextTool = tool({
  description: 'Format text in various ways (uppercase, lowercase, title case, or add emphasis)',
  inputSchema: z.object({
    text: z.string().describe('The text to format'),
    format: z.enum(['uppercase', 'lowercase', 'title', 'emphasis']).describe('How to format the text'),
    prefix: z.string().optional().describe('Optional prefix to add before the text')
  }),
  execute: async ({ text, format, prefix }) => {
    let formattedText = text;
    
    switch (format) {
      case 'uppercase':
        formattedText = text.toUpperCase();
        break;
      case 'lowercase':
        formattedText = text.toLowerCase();
        break;
      case 'title':
        formattedText = text.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        break;
      case 'emphasis':
        formattedText = `**${text}**`;
        break;
      default:
        formattedText = text;
    }
    
    const result = prefix ? `${prefix} ${formattedText}` : formattedText;
    
    return {
      success: true,
      originalText: text,
      formattedText: result,
      formatUsed: format,
      timestamp: new Date().toISOString(),
      message: `Text formatted successfully using ${format} format`
    };
  }
});