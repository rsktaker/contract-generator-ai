import { simpleTextTool } from './simple-text-tool';
import { generateTitleTool } from './generate-title-tool';
import { writeContractTool } from './write-contract-tool';
import { extractUnknownsTool } from './extract-unknowns-tool';

/**
 * All available tools for the contract generation agent
 * Following the use-chat-tools pattern from AI SDK
 */
export const tools = {
  // Testing and utility tools
  simpleTextTool,
  
  // Contract generation tools
  generateTitleTool,
  writeContractTool,
  extractUnknownsTool,
  
  // Client-side tools (no execute function - handled by UI)
  // askForConfirmation: tool({
  //   description: 'Ask the user for confirmation before proceeding',
  //   inputSchema: z.object({
  //     message: z.string().describe('The confirmation message to show'),
  //   }),
  //   outputSchema: z.string(),
  // }),
} as const;

export type ContractTools = typeof tools;