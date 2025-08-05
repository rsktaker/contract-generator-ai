# PRD-2: UX & Frontend Improvements

## Executive Summary

Enhance the user experience with streaming contract generation, improved visual feedback, and modern interaction patterns. Focus on making the contract generation feel "flashy" and engaging while maintaining the core functionality of document creation and signing.

## Current UX State Analysis

### Current User Flow
1. User enters contract description in textarea
2. Clicks "Generate" button → loading state
3. Waits ~10-60 seconds with minimal feedback
4. Contract appears fully formed
5. User can fill in bracketed unknowns manually
6. Sign and send contract

### Current UX Problems
- **Long wait times** with minimal feedback
- **No progress indication** during generation
- **Static generation**: Contract appears all at once
- **Limited interactivity** during generation process
- **No real-time editing** during generation
- **Basic error handling** (just alert boxes)

## Target UX Vision

### "Flashy" Streaming Experience
- **Real-time contract writing**: Users watch contract being written word-by-word
- **Tool execution visibility**: Show which AI tool is running ("Generating title...", "Adding legal clauses...")
- **Progressive disclosure**: Contract sections appear as they're completed
- **Interactive generation**: Allow users to provide feedback during generation
- **Smooth animations**: Typewriter effects, smooth transitions, progress indicators

### Enhanced User Journey
```
User Input → Streaming Generation → Real-time Feedback → Interactive Editing → Signing
```

## Core UX Improvements

### 1. Streaming Contract Generation UI

#### Real-time Typewriter Effect
```typescript
// Component: StreamingContractDisplay
- Word-by-word streaming from AI SDK
- Cursor animation showing active writing
- Syntax highlighting for legal terms
- Section-by-section reveal
```

#### Tool Execution Status
```typescript
// Component: GenerationProgress
- "🔧 Using write_contract_content tool..."
- "📝 Generating contract title..."
- "🔍 Extracting required information..."
- "✅ Contract draft complete!"
```

#### Progress Visualization
```typescript
// Component: GenerationSteps
- Step indicators: Title → Content → Unknowns → Review
- Progress bar with estimated completion time
- Tool execution timeline
```

### 2. Interactive Generation Experience

#### Real-time Unknown Detection
```typescript
// As contract streams in:
- Highlight [bracketed items] as they appear
- Show tooltip: "This will need your input"
- Allow clicking to provide info immediately
- Update contract in real-time when filled
```

#### Generation Feedback Loop
```typescript
// During streaming:
- "Pause Generation" button
- "Add Requirement" button → inject mid-stream
- "Change Direction" → modify generation on the fly
```

### 3. Enhanced Contract Editor

#### Smart Unknown Filling
```typescript
// Component: SmartUnknownEditor
- Contextual input types (date picker, currency, dropdown)
- Auto-suggestions based on contract type
- Validation hints ("This looks like a company name")
- Bulk filling for repeated values
```

#### Live Preview Updates
```typescript
// As user fills unknowns:
- Contract updates immediately
- PDF preview updates in real-time
- Character/word count for legal sections
- Format validation feedback
```

### 4. Modern UI Components

#### Improved Contract Card
```typescript
// Replace basic textarea with:
- Rich text editor with legal formatting
- Syntax highlighting for contract terms
- Collapsible sections (Terms, Payment, Signatures)
- Export options (PDF, Word, Plain Text)
```

#### Enhanced Generation Interface
```typescript
// Replace simple form with:
- Multi-step wizard for complex contracts
- Contract type templates (Service, NDA, Employment)
- Smart prompting with examples
- Voice input for prompts (optional)
```

## Technical Implementation

### 1. AI SDK React Integration

#### Streaming Hook Setup
```typescript
// hooks/useContractGeneration.ts
import { useChat } from '@ai-sdk/react';

export function useContractGeneration() {
  const { messages, isLoading, append, stop } = useChat({
    api: '/api/contracts/generate',
    streamMode: 'text'
  });
  
  return {
    generateContract: append,
    contractContent: messages.find(m => m.role === 'assistant')?.content,
    isGenerating: isLoading,
    stopGeneration: stop
  };
}
```

#### Real-time Typewriter Component
```typescript
// components/StreamingContract.tsx
export function StreamingContract({ content }: { content: string }) {
  const [displayedContent, setDisplayedContent] = useState('');
  
  useEffect(() => {
    if (!content) return;
    
    let i = 0;
    const timer = setInterval(() => {
      if (i < content.length) {
        setDisplayedContent(content.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 50); // Adjust speed for "flashy" effect
    
    return () => clearInterval(timer);
  }, [content]);
  
  return (
    <div className="contract-display">
      {displayedContent}
      <span className="cursor animate-pulse">|</span>
    </div>
  );
}
```

### 2. Enhanced UI Components

#### Generation Progress Component
```typescript
// components/GenerationProgress.tsx
export function GenerationProgress({ toolExecution, step, totalSteps }) {
  return (
    <div className="generation-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
      
      <div className="current-tool">
        <AnimatedIcon icon={toolExecution.icon} />
        <span>{toolExecution.message}</span>
      </div>
      
      <div className="step-indicators">
        {Array.from({ length: totalSteps }, (_, i) => (
          <StepIndicator 
            key={i} 
            active={i === step} 
            completed={i < step}
          />
        ))}
      </div>
    </div>
  );
}
```

#### Smart Unknown Editor
```typescript
// components/SmartUnknownEditor.tsx
export function SmartUnknownEditor({ unknowns, onUpdate }) {
  return (
    <div className="unknowns-editor">
      {unknowns.map(unknown => (
        <UnknownField
          key={unknown.id}
          type={detectFieldType(unknown.text)} // date, currency, text, etc.
          placeholder={unknown.text}
          suggestions={getSuggestions(unknown.context)}
          onChange={(value) => onUpdate(unknown.id, value)}
        />
      ))}
    </div>
  );
}
```

### 3. Animation & Visual Polish

#### CSS Animations
```scss
// Contract streaming animations
.contract-streaming {
  .text-chunk {
    opacity: 0;
    animation: fadeInUp 0.3s ease-forward;
    animation-fill-mode: forwards;
  }
  
  .cursor {
    animation: blink 1s infinite;
  }
  
  .tool-status {
    transform: translateY(20px);
    opacity: 0;
    animation: slideInUp 0.4s ease-out forwards;
  }
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## User Experience Flows

### 1. Enhanced Generation Flow
```
1. User enters prompt → Smart suggestions appear
2. Contract type detection → Template recommendations
3. Click Generate → Streaming begins immediately
4. Tool status updates → "Analyzing requirements..."
5. Contract streams in → Word-by-word with highlighting
6. Unknowns highlight → Real-time tooltip guidance
7. Generation completes → Smooth transition to editor
8. User fills unknowns → Live preview updates
9. Export/Sign options → Streamlined workflow
```

### 2. Error Handling Flow
```
1. Generation error → Graceful failure message
2. Retry options → "Try different approach" suggestions
3. Partial success → Save progress, continue manually
4. Network issues → Offline mode with cached templates
```

## Success Metrics

### Performance Targets
- **First token latency**: <2 seconds
- **Streaming speed**: 50-75 words per minute (adjustable)
- **Tool transition time**: <1 second between tools
- **UI responsiveness**: 60fps animations

### User Engagement
- **Time to first interaction**: <5 seconds
- **Generation completion rate**: >85%
- **User satisfaction**: "Flashy" and engaging experience
- **Return usage**: Users want to generate more contracts

## Implementation Priority

### Phase 1: Core Streaming (Week 1)
- [ ] AI SDK React hooks integration
- [ ] Basic streaming contract display
- [ ] Tool execution status display
- [ ] Progress indicators

### Phase 2: Interactive Features (Week 2)
- [ ] Real-time unknown highlighting
- [ ] Smart unknown filling interface
- [ ] Generation pause/resume controls
- [ ] Live preview updates

### Phase 3: Visual Polish (Week 3)
- [ ] Typewriter animations
- [ ] Smooth transitions
- [ ] Enhanced UI components
- [ ] Mobile responsive design

### Phase 4: Advanced Features (Week 4)
- [ ] Voice input for prompts
- [ ] Contract templates wizard
- [ ] Advanced editing tools
- [ ] Export format options

## Risk Considerations

### Performance Risks
- **Streaming overload**: Too fast streaming may overwhelm users
- **Memory usage**: Long contracts may cause browser lag
- **Network reliability**: Streaming interruptions need graceful handling

### UX Risks
- **Novelty wearing off**: "Flashy" effect may become annoying
- **Accessibility**: Ensure streaming is screen reader friendly
- **Mobile experience**: Streaming must work well on mobile devices

## Success Criteria
- [ ] Users engage with streaming generation (don't navigate away)
- [ ] Generation feels fast and responsive despite same total time
- [ ] Tool execution visibility improves user confidence
- [ ] Unknown filling becomes more intuitive
- [ ] Overall user satisfaction increases significantly
- [ ] Demo appeal: Non-technical stakeholders are impressed

## Next Steps
1. Create streaming UI prototype
2. Test typewriter effect speeds with users
3. Implement basic tool status display
4. A/B test streaming vs. non-streaming experience
5. Iterate based on user feedback