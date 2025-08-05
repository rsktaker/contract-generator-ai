import { NextRequest } from "next/server";
import { contractAgent } from "@/lib/agent";
import type { ContractMessage } from "@/lib/agent";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * Test API route for the new AI SDK Contract Agent
 * This route tests streaming and tool calling functionality
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt, streaming = true, messages } = await request.json();

    if (!prompt && !messages) {
      return Response.json(
        { error: "Prompt or messages array is required" },
        { status: 400 }
      );
    }

    if (streaming) {
      let result;
      
      if (messages && Array.isArray(messages)) {
        // Use messages array (for useChat integration)
        result = await contractAgent.generateContractFromMessages(messages as ContractMessage[]);
      } else {
        // Use simple prompt
        result = await contractAgent.generateContractStream(prompt, {
          isAnonymous: true,
          userName: "Test User"
        });
      }

      // Return proper UI message stream response
      return result.toUIMessageStreamResponse({
        onFinish: (options) => {
          console.log('Contract generation finished:', options);
        },
      });
    } else {
      // Test non-streaming generation
      const result = await contractAgent.generateContract(prompt, {
        isAnonymous: true,
        userName: "Test User"
      });

      return Response.json({
        success: true,
        text: result.text,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        usage: result.usage,
        finishReason: result.finishReason
      });
    }
  } catch (error) {
    console.error("Test agent error:", error);
    return Response.json(
      { 
        error: "Failed to generate contract",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET route for health check and tool testing
 */
export async function GET() {
  try {
    // Test agent health
    const healthCheck = await contractAgent.healthCheck();
    
    // Test tools
    const toolTest = await contractAgent.testTools();
    
    // Get available tools
    const availableTools = contractAgent.getAvailableTools();

    return Response.json({
      health: healthCheck,
      toolTest: toolTest,
      availableTools: availableTools,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json(
      { 
        error: "Health check failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}