import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  streamText,
  generateText,
  stepCountIs,
  convertToModelMessages,
  InferUITools,
  UIDataTypes,
  UIMessage,
} from 'ai';
import { tools } from './tools';

/**
 * Contract Generation Agent using stable AI SDK streamText with tools
 * Replaces the old lib/openai.ts with streaming capabilities and tool calling
 */

// Type for our contract messages
export type ContractMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<typeof tools>
>;

// System prompt for contract generation
const systemPrompt = `You are a professional contract lawyer with expertise in generating comprehensive, legally sound contracts.

Your capabilities include:
- Generating contract titles based on user requirements
- Creating detailed contract content with proper legal structure
- Extracting unknown variables that need to be filled in
- Formatting text professionally
- Using appropriate legal language and clauses

When generating contracts:
1. Always use clear, professional legal language
2. Include necessary legal clauses and protections
3. Use standard contract formatting with numbered sections
4. Use [BRACKETED] placeholders for information that needs to be filled in later
5. DO NOT include signature blocks - those are handled separately
6. Use **bold text** for section headings

Available tools:
- simpleTextTool: Format text in various ways (for testing)
- generateTitleTool: Create professional contract titles
- writeContractTool: Generate comprehensive contract content
- extractUnknownsTool: Find variables that need to be filled in

Use these tools when appropriate to help generate professional contracts. For contract generation, use the writeContractTool to create the main content, then use extractUnknownsTool to identify what needs to be filled in.`;

export class ContractAgent {
  private model = openai('gpt-4o');
  private fallbackModel = anthropic('claude-3-5-sonnet-20241022');

  /**
   * Generate contract with streaming using stable streamText API
   */
  async generateContractStream(userPrompt: string, options: {
    isAnonymous?: boolean;
    userId?: string;
    userName?: string;
  } = {}) {
    const { isAnonymous = false, userName = 'Anonymous User' } = options;
    
    // Enhance the prompt with context
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const contextualPrompt = isAnonymous 
      ? `Today is ${currentDate}. The user is anonymous. Please generate a contract where the user's name should be represented as a bracketed unknown like [Your Name] that can be filled in later. ${userPrompt}`
      : `Today is ${currentDate}. This is the user's name: ${userName}. ${userPrompt}`;

    try {
      const result = streamText({
        model: this.model,
        system: systemPrompt,
        messages: [
          { role: 'user', content: contextualPrompt }
        ],
        tools,
        stopWhen: stepCountIs(5), // Allow multi-step tool usage
        temperature: 0.2,
        // Remove maxTokens - not supported in streamText
      });

      return result;
    } catch (error) {
      console.error('[ContractAgent] Primary model failed:', error);
      
      // Fallback to Anthropic
      try {
        const fallbackResult = streamText({
          model: this.fallbackModel,
          system: systemPrompt,
          messages: [
            { role: 'user', content: contextualPrompt }
          ],
          tools,
          stopWhen: stepCountIs(5),
          temperature: 0.2,
        });
        
        return fallbackResult;
      } catch (fallbackError) {
        console.error('[ContractAgent] Fallback model also failed:', fallbackError);
        throw new Error(`Contract generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Generate contract with messages array (for use-chat integration)
   */
  async generateContractFromMessages(messages: ContractMessage[]) {
    try {
      const result = streamText({
        model: this.model,
        messages: convertToModelMessages(messages),
        system: systemPrompt,
        stopWhen: stepCountIs(5),
        tools,
        temperature: 0.2,
      });

      return result;
    } catch (error) {
      console.error('[ContractAgent] Message-based generation failed:', error);
      throw new Error(`Contract generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate contract without streaming (for testing and backwards compatibility)
   */
  async generateContract(userPrompt: string, options: {
    isAnonymous?: boolean;
    userId?: string;
    userName?: string;
  } = {}) {
    const { isAnonymous = false, userName = 'Anonymous User' } = options;
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',  
      day: 'numeric'
    });
    
    const contextualPrompt = isAnonymous 
      ? `Today is ${currentDate}. The user is anonymous. Please generate a contract where the user's name should be represented as a bracketed unknown like [Your Name] that can be filled in later. ${userPrompt}`
      : `Today is ${currentDate}. This is the user's name: ${userName}. ${userPrompt}`;

    try {
      const result = await generateText({
        model: this.model,
        system: systemPrompt,
        messages: [
          { role: 'user', content: contextualPrompt }
        ],
        tools,
        stopWhen: stepCountIs(5),
        temperature: 0.2,
        // Remove maxTokens - not supported in generateText
      });

      return {
        text: result.text,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        usage: result.usage,
        finishReason: result.finishReason
      };
    } catch (error) {
      console.error('[ContractAgent] Generation failed:', error);
      throw new Error(`Contract generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test method to validate tool calling works
   */
  async testTools() {
    try {
      const result = await this.generateContract('Please format the text "hello world" in uppercase and generate a title for a service agreement');
      
      return {
        success: true,
        text: result.text,
        toolsUsed: result.toolCalls?.length || 0,
        toolResults: result.toolResults,
        usage: result.usage,
        finishReason: result.finishReason,
        message: 'Tool testing completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Tool testing failed'
      };
    }
  }

  /**
   * Health check for the agent
   */
  async healthCheck() {
    try {
      const result = await generateText({
        model: this.model,
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Say "AI SDK Agent is working" and use the simpleTextTool to format it in uppercase.' }],
        tools,
        // Remove maxTokens - not supported
      });

      return {
        status: 'healthy',
        text: result.text.substring(0, 200), // Truncate for display
        toolsAvailable: Object.keys(tools).length,
        model: 'gpt-4o',
        fallbackModel: 'claude-3-5-sonnet-20241022'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        toolsAvailable: Object.keys(tools).length
      };
    }
  }

  /**
   * Switch AI provider (useful for testing different models)
   */
  switchProvider(provider: 'openai' | 'anthropic') {
    if (provider === 'anthropic') {
      this.model = this.fallbackModel;
    } else {
      this.model = openai('gpt-4o');
    }
  }

  /**
   * Get available tools list
   */
  getAvailableTools() {
    return {
      simpleTextTool: {
        name: 'Simple Text Tool',
        description: 'Format text in various ways (for testing)'
      },
      generateTitleTool: {
        name: 'Generate Title Tool', 
        description: 'Generate professional contract titles'
      },
      writeContractTool: {
        name: 'Write Contract Tool',
        description: 'Generate comprehensive contract content'
      },
      extractUnknownsTool: {
        name: 'Extract Unknowns Tool',
        description: 'Find variables that need to be filled in'
      }
    };
  }
}

// Export singleton instance
export const contractAgent = new ContractAgent();

// Export factory function for multiple instances if needed
export function createContractAgent(): ContractAgent {
  return new ContractAgent();
}