import { ToolSet } from 'ai';
import { writeContractTool } from './write-contract-tool';

export const tools = {
  writeContractTool,
} satisfies ToolSet;