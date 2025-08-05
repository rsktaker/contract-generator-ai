# PRD-1: AI SDK Migration for Contract Generation

## Executive Summary

Migrate the current vanilla OpenAI implementation (`lib/openai.ts`) to Vercel AI SDK with streaming, tool calling, and improved architecture. This migration will replace 6 separate OpenAI API calls with a single AI SDK agent that uses tools for contract generation, enabling real-time streaming and better user experience.

## Current State Analysis

### Current Implementation Problems
- **6 separate OpenAI API calls** in `lib/openai.ts`: `generateContractTitle()`, `generateContractText()`, `extractUnknowns()`, `extractParties()`, `regenerateContractText()`, `generateContractData()`
- **No streaming**: Users wait for complete generation before seeing results
- **Complex orchestration**: Manual Promise.all() coordination
- **No tool calling**: Functions are hardcoded API calls, not dynamic tools
- **Poor error handling**: Basic try/catch without recovery
- **Provider lock-in**: Hard-coded to OpenAI only

### Current Flow
```
User Request → API Route → generateContractData() → [6 API calls] → JSON Response → Database
```

## Target State with AI SDK

### New Architecture
```
User Request → AI SDK Agent → Tools (streaming) → Real-time UI Updates → Database
```

### Core AI SDK Tools to Implement

1. **`write_contract_content`** - Main contract text generation
   ```typescript
   tool({
     description: 'Generate comprehensive contract content based on user requirements',
     inputSchema: z.object({
       userPrompt: z.string(),
       contractType: z.enum(['service', 'nda', 'employment', 'lease', 'custom']),
       parties: z.array(z.object({
         name: z.string(),
         role: z.string()
       })).optional()
     })
   })
   ```

2. **`extract_contract_unknowns`** - Find bracketed placeholders  
   ```typescript
   tool({
     description: 'Extract unknown variables that need to be filled in from contract text',
     inputSchema: z.object({
       contractText: z.string()
     })
   })
   ```

3. **`edit_contract_content`** - Modify existing contracts
   ```typescript
   tool({
     description: 'Modify existing contract based on user instructions',
     inputSchema: z.object({
       originalText: z.string(),
       userInstructions: z.string()
     })
   })
   ```

4. **`generate_contract_title`** - Create appropriate titles
   ```typescript
   tool({
     description: 'Generate professional contract title based on content',
     inputSchema: z.object({
       userPrompt: z.string(),
       contractType: z.string().optional()
     })
   })
   ```

## Migration Plan

### Phase 1: Core AI SDK Setup
- [ ] Install AI SDK dependencies: `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`
- [ ] Create new `lib/ai-sdk.ts` replacing `lib/openai.ts`
- [ ] Implement basic `streamText` with tools
- [ ] Set up provider abstraction (OpenAI + Claude support)

### Phase 2: Tool Implementation
- [ ] Convert `generateContractText()` → `write_contract_content` tool
- [ ] Convert `extractUnknowns()` → `extract_contract_unknowns` tool  
- [ ] Convert `regenerateContractText()` → `edit_contract_content` tool
- [ ] Convert `generateContractTitle()` → `generate_contract_title` tool
- [ ] Remove `extractParties()` (marked as "ridiculous and unnecessary")

### Phase 3: API Route Migration
- [ ] Update `/api/contracts/generate/route.ts` to use AI SDK
- [ ] Implement streaming with `streamText()` 
- [ ] Add real-time tool execution feedback
- [ ] Maintain existing database schema compatibility
- [ ] Keep current API response format for frontend compatibility

### Phase 4: Frontend Integration
- [ ] Add streaming UI updates using AI SDK React hooks
- [ ] Show real-time contract generation progress
- [ ] Display tool execution status (e.g., "Generating title...", "Extracting unknowns...")
- [ ] Maintain fallback for non-streaming clients

## Technical Implementation

### New AI SDK Agent Structure
```typescript
// lib/ai-sdk.ts
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

export class ContractAgent {
  private model = openai('gpt-4o'); // Default provider
  
  private tools = {
    write_contract_content: tool({
      description: 'Generate comprehensive contract content',
      inputSchema: z.object({
        userPrompt: z.string(),
        contractType: z.enum(['service', 'nda', 'employment', 'lease', 'custom']),
        isAnonymous: z.boolean().default(false)
      }),
      execute: async ({ userPrompt, contractType, isAnonymous }) => {
        // Implementation logic
      }
    }),
    // ... other tools
  };

  async generateContract(prompt: string, isAnonymous: boolean = false) {
    return streamText({
      model: this.model,
      system: `You are a professional contract lawyer. Use available tools to generate comprehensive contracts.`,
      messages: [{ role: 'user', content: prompt }],
      tools: this.tools,
      toolChoice: 'required', // Force tool usage
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'contract-generation'
      }
    });
  }
}
```

### Updated API Route Pattern
```typescript
// /api/contracts/generate/route.ts
export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  
  const agent = new ContractAgent();
  const result = await agent.generateContract(prompt);
  
  // Stream response to client
  return result.pipeAIStreamToResponse(response);
}
```

## Success Metrics

### Performance Improvements
- **Streaming latency**: First token in <2 seconds (vs current ~10s wait)
- **Total generation time**: Maintain current ~30-60s total time
- **Error rate**: <5% tool execution failures
- **Provider flexibility**: Support OpenAI + Claude seamlessly

### User Experience
- **Real-time feedback**: Users see generation progress immediately
- **Flashy streaming**: Word-by-word contract generation for demo appeal
- **Tool transparency**: Show which tool is executing ("Generating title...")
- **Graceful degradation**: Fallback to non-streaming if needed

## Risk Mitigation

### Backwards Compatibility
- Keep existing API response format
- Maintain current database schema
- Support both streaming and non-streaming clients
- Preserve anonymous user functionality

### Migration Safety
- Deploy AI SDK alongside existing implementation
- Feature flag for gradual rollout
- A/B testing between implementations
- Easy rollback to vanilla OpenAI if needed

## Dependencies & Timeline

### New Dependencies
```json
{
  "ai": "^5.0.0",
  "@ai-sdk/openai": "^0.x.x", 
  "@ai-sdk/anthropic": "^0.x.x",
  "zod": "^3.x.x" // upgrade if needed
}
```

### Timeline Estimate
- **Phase 1**: 2-3 days (setup)
- **Phase 2**: 3-4 days (tool implementation) 
- **Phase 3**: 2-3 days (API migration)
- **Phase 4**: 2-3 days (frontend)
- **Total**: ~10-12 days

### Success Criteria
- [ ] All existing functionality preserved
- [ ] Streaming contract generation working
- [ ] Multiple AI providers supported
- [ ] Tool execution visible to users
- [ ] Performance equal or better than current
- [ ] Zero breaking changes to existing API contracts

## Next Steps
1. Set up development environment with AI SDK
2. Create POC with single tool (`write_contract_content`)
3. Test streaming functionality with current frontend
4. Get stakeholder approval for full migration
5. Begin phased implementation