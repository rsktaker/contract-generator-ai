//app/contracts/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from "@/components/Header";
import { ContractView } from './components/ContractView';
import { ChatInterface } from './components/ChatInterface';
import { ErrorModal } from './components/ErrorModal';
import { SkeletonLoaders } from './components/SkeletonLoaders';
import { useContract } from './hooks/useContract';
import { useMobileDetect } from './hooks/useMobileDetect';
import { contractApi } from './utils/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ContractPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const contractId = params.id as string;
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isMobileView = useMobileDetect();
  
  // Get initial prompt from URL parameters
  const initialPrompt = searchParams?.get('prompt') || null;

  // Contract management
  const {
    contract,
    contractJson,
    setContractJson,
    isLoading,
    saveStatus,
    error,
    setError,
    setContract
  } = useContract();

  // Chat management
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isGeneratingInitialMessage, setIsGeneratingInitialMessage] = useState(true);
  const [isProcessingChatMessage, setIsProcessingChatMessage] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isReplacingUnknowns, setIsReplacingUnknowns] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [dismissedUnknowns, setDismissedUnknowns] = useState<string[]>([]);

  // Load chat messages from database
  useEffect(() => {
    if (contractId) {
      loadChatMessages();
    }
  }, [contractId]);

  // Auto-send initial prompt if we have one and no existing chat messages
  useEffect(() => {
    if (initialPrompt && !isGeneratingInitialMessage && chatMessages.length === 0) {
      console.log('[CONTRACT-PAGE] Auto-sending initial prompt:', initialPrompt);
      processChatMessage(initialPrompt);
    }
  }, [initialPrompt, isGeneratingInitialMessage, chatMessages.length]);

  const loadChatMessages = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/chat`);
      if (response.ok) {
        const data = await response.json();
        setChatMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    } finally {
      setIsGeneratingInitialMessage(false);
    }
  };

  const startNewChat = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/chat`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await loadChatMessages();
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  };

  const processChatMessage = async (message: string) => {
    // Immediately add user message to chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    // Add user message to local state immediately
    setChatMessages(prev => [...prev, userMessage]);
    
    // Clear the input immediately
    setNewMessage('');
    
    setIsProcessingChatMessage(true);
    
    try {
      // First, analyze if this is a regeneration request using the updated API
      const regenerationAnalysisResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Analyze if this user message requires contract regeneration. Contract: ${JSON.stringify(contractJson, null, 2)}`
            },
            ...chatMessages.map(msg => ({ role: msg.role, content: msg.content })),
            {
              role: 'user',
              content: `Should I regenerate the contract for this request: "${message}"? Respond with JSON: {"shouldRegenerate": true/false, "reason": "explanation"}`
            }
          ]
        }),
      });

      if (regenerationAnalysisResponse.ok) {
        // Parse streaming response for regeneration analysis
        const analysisText = await regenerationAnalysisResponse.text();
        let analysisContent = '';
        
        // Extract content from streaming format
        const analysisLines = analysisText.split('\n').filter(line => line.startsWith('data: '));
        for (const line of analysisLines) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'text-delta') {
              analysisContent += data.delta;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
        
        console.log('Regeneration analysis content:', analysisContent);
        
        // Try to parse JSON response
        let shouldRegenerate = false;
        try {
          const parsedResponse = JSON.parse(analysisContent);
          shouldRegenerate = parsedResponse.shouldRegenerate;
        } catch (e) {
          // If not JSON, check if content contains regeneration keywords
          shouldRegenerate = analysisContent.toLowerCase().includes('regenerat') || 
                           analysisContent.toLowerCase().includes('modify') ||
                           analysisContent.toLowerCase().includes('change');
        }
        
        if (shouldRegenerate) {
          console.log('Regeneration needed, calling handleRegenerateContract');
          // Handle regeneration with dismissed unknowns if any
          await handleRegenerateContract(message, dismissedUnknowns.length > 0 ? dismissedUnknowns : undefined);
          // Clear dismissed unknowns after regeneration
          setDismissedUnknowns([]);
          return;
        }
      } else {
        console.error('Regeneration analysis failed:', regenerationAnalysisResponse.status);
      }

      // Regular chat message using the updated API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a contract assistant helping with this contract: ${contractJson?.title || contract?.title || 'Contract'}. Contract details: ${JSON.stringify(contractJson, null, 2)}`
            },
            ...chatMessages.map(msg => ({ role: msg.role, content: msg.content })),
            {
              role: 'user',
              content: message
            }
          ]
        }),
      });

      if (response.ok) {
        // Parse streaming response
        const text = await response.text();
        let responseContent = '';
        
        // Extract content from streaming format and check for tool calls
        const lines = text.split('\n').filter(line => line.startsWith('data: '));
        let toolResults: any[] = [];
        let toolCalls: any[] = [];
        
        console.log('[CHAT-PROCESS] Processing streaming response with', lines.length, 'lines');
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line.substring(6)); // Remove 'data: '
            console.log('[CHAT-PROCESS] Line type:', data.type, data);
            
            if (data.type === 'text-delta') {
              responseContent += data.delta;
            } else if (data.type === 'tool-result') {
              toolResults.push(data);
              console.log('[CHAT-PROCESS] Tool result received:', JSON.stringify(data, null, 2));
            } else if (data.type === 'tool-call') {
              toolCalls.push(data);
              console.log('[CHAT-PROCESS] Tool call detected:', JSON.stringify(data, null, 2));
            }
          } catch (e) {
            console.log('[CHAT-PROCESS] Failed to parse line:', line, e);
          }
        }
        
        console.log('[CHAT-PROCESS] Summary:');
        console.log('- Response content length:', responseContent.length);
        console.log('- Tool calls found:', toolCalls.length);
        console.log('- Tool results found:', toolResults.length);
        
        // Check for writeContractTool results and update contract display
        const contractToolResult = toolResults.find(result => 
          result.toolName === 'writeContractTool' || 
          (result.result && result.result.content)
        );
        
        if (contractToolResult && contractToolResult.result) {
          console.log('Found writeContractTool result, updating contract display');
          const toolResult = contractToolResult.result;
          
          // Update the contract with the tool result
          const updatedContractJson = {
            ...contractJson,
            title: toolResult.title || contractJson?.title || 'Generated Contract',
            blocks: [
              {
                text: toolResult.content || toolResult.text || contractJson?.blocks?.[0]?.text || '',
                signatures: contractJson?.blocks?.[0]?.signatures || []
              }
            ],
            unknowns: contractJson?.unknowns || [] // Ensure unknowns is always an array
          };
          
          console.log('Updating contract with tool result:', updatedContractJson);
          if (updatedContractJson && setContractJson) {
            setContractJson(updatedContractJson);
            
            // Save updated contract content to database so Sign page can access it
            try {
              await fetch(`/api/contracts/${contractId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: updatedContractJson,
                  title: updatedContractJson.title
                }),
              });
              console.log('Saved updated contract content to database');
            } catch (error) {
              console.error('Error saving contract content to database:', error);
            }
          }
        }
        
        // Create AI response message
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: responseContent || 'I apologize, but I encountered an error processing your request.',
          timestamp: new Date()
        };
        
        // Add AI message to local state
        setChatMessages(prev => [...prev, aiMessage]);
        
        // Save messages to database
        await fetch(`/api/contracts/${contractId}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            response: responseContent
          }),
        });
      }
    } catch (error) {
      console.error('Error processing chat message:', error);
      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessingChatMessage(false);
    }
  };

  // Handle contract updates
  const handleContractUpdate = async (updatedContractJson: any) => {
    setContractJson(updatedContractJson);
  };

  const handleRegenerateBlock = async (blockIndex: number, userInstructions: string) => {
    if (!contractJson) return;
    
    try {
      const data = await contractApi.regenerateBlock(contractJson, blockIndex, userInstructions);
      setContractJson(data);
    } catch (error) {
      console.error('Error regenerating block:', error);
      setError({
        title: "Block Regeneration Failed",
        message: error instanceof Error ? error.message : "Failed to regenerate block. Please try again."
      });
    }
  };

  const handleManualBlockEdit = async (blockIndex: number, updatedBlock: any) => {
    if (!contractJson) return;
    
    const updatedContractJson = {
      ...contractJson,
      blocks: contractJson.blocks.map((block: any, index: number) =>
        index === blockIndex ? updatedBlock : block
      )
    };
    
    setContractJson(updatedContractJson);
  };

  const handleReplaceUnknowns = async (replacements: Record<string, string>, dismissedUnknowns: string[]) => {
    if (!contractJson) return;
    
    console.log('handleReplaceUnknowns called with:', { replacements, dismissedUnknowns });
    setIsReplacingUnknowns(true);
    
    try {
      // Replace unknowns in the contract text
      let updatedText = contractJson.blocks[0]?.text || '';
      console.log('Original text:', updatedText);
      
      Object.entries(replacements).forEach(([unknown, replacement]) => {
        const regex = new RegExp(`\\[${unknown}\\]`, 'g');
        console.log(`Replacing [${unknown}] with "${replacement}"`);
        updatedText = updatedText.replace(regex, replacement);
      });
      
      console.log('Updated text:', updatedText);
      
      // Update the contract
      const updatedContractJson = {
        ...contractJson,
        blocks: contractJson.blocks.map((block: any, index: number) =>
          index === 0 ? { ...block, text: updatedText } : block
        )
      };
      
      console.log('Setting new contractJson:', updatedContractJson);
      setContractJson(updatedContractJson);
      
      // Save updated contract content to database so Sign page can access it
      try {
        await fetch(`/api/contracts/${contractId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: updatedContractJson,
            title: updatedContractJson.title
          }),
        });
        console.log('Saved contract content with replaced unknowns to database');
      } catch (error) {
        console.error('Error saving contract content to database:', error);
      }
      
      // Store dismissed unknowns for potential regeneration
      if (dismissedUnknowns.length > 0) {
        setDismissedUnknowns(dismissedUnknowns);
        
        const dismissedList = dismissedUnknowns.length === 1 
          ? dismissedUnknowns[0] 
          : dismissedUnknowns.slice(0, -1).join(', ') + ' and ' + dismissedUnknowns[dismissedUnknowns.length - 1];
        
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: `I noticed you dismissed ${dismissedList}. Would you like me to regenerate the contract to not include ${dismissedUnknowns.length === 1 ? 'this unknown' : 'these unknowns'}?`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error replacing unknowns:', error);
    } finally {
      setIsReplacingUnknowns(false);
    }
  };

  const handleRegenerateContract = async (userInstructions: string, dismissedUnknowns?: string[]) => {
    if (!contractJson) return;
    
    console.log('Starting regeneration with instructions:', userInstructions, 'dismissedUnknowns:', dismissedUnknowns);
    setIsRegenerating(true);
    
    try {
      // Generate conversational AI message for regeneration
      const initialResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Generate a brief, conversational response to: "${userInstructions}"`,
          contractJson,
          isRegenerationInitial: true
        }),
      });

      let initialMessage = 'Got it, I\'ll regenerate the contract with your changes.';
      if (initialResponse.ok) {
        const initialData = await initialResponse.json();
        initialMessage = initialData.response;
      }

      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
      
      console.log('Calling regeneration API...');
      // Call regeneration API
      const response = await fetch('/api/regenerateContract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          contractJson,
          userInstructions,
          dismissedUnknowns
        }),
      });

      console.log('Regeneration API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Regeneration successful, updating contract');
        setContractJson(data.contractJson);
        
        // Save updated contract content to database so Sign page can access it
        try {
          await fetch(`/api/contracts/${contractId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: data.contractJson,
              title: data.contractJson.title
            }),
          });
          console.log('Saved regenerated contract content to database');
        } catch (error) {
          console.error('Error saving regenerated contract content to database:', error);
        }
        
        // Generate completion message with unknowns check
        const completionResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: "Generate completion message",
            contractJson: data.contractJson,
            isSummary: true
          }),
        });

        let completionMessage = 'Contract has been regenerated with your requested changes.';
        if (completionResponse.ok) {
          const completionData = await completionResponse.json();
          completionMessage = completionData.response;
        }
        
        const completionMsg: ChatMessage = {
          role: 'assistant',
          content: completionMessage,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, completionMsg]);
      } else {
        console.error('Regeneration API failed:', response.status, await response.text());
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error while regenerating the contract. Please try again.',
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error('Error regenerating contract:', error);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while regenerating the contract. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contractJson || !contract) return;
    
    setIsDownloadingPDF(true);
    try {
      const blob = await contractApi.generatePDF(contract._id, contractJson);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${contract._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError({
        title: "PDF Generation Failed",
        message: "Failed to generate PDF. Please try again."
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  if (isLoading || !contractJson) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Header authenticated={isAuthenticated} />
        <div className="flex flex-col flex-1 bg-gray-50 overflow-hidden">
          <SkeletonLoaders />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Header authenticated={isAuthenticated} />
        <ErrorModal 
          isOpen={true}
          onClose={() => setError(null)}
          title={error.title}
          message={error.message}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header authenticated={isAuthenticated} />
      
      <div className="flex flex-1 bg-gray-50 overflow-hidden">
        {/* Left: Contract View */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ContractView
            contractJson={contractJson}
            saveStatus={saveStatus}
            onDownloadPDF={handleDownloadPDF}
            isDownloadingPDF={isDownloadingPDF}
          />
        </div>

        {/* Right: Chat + Send Panel */}
        <div className="w-full lg:w-5/12 flex flex-col space-y-4 p-4 min-h-0">
          {/* Chat Interface */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              chatMessages={chatMessages}
              isGeneratingInitialMessage={isGeneratingInitialMessage}
              isProcessingChatMessage={isProcessingChatMessage}
              newMessage={newMessage}
              onNewMessageChange={setNewMessage}
              onSendMessage={processChatMessage}
              onNewChat={startNewChat}
              contractText={contractJson?.blocks?.[0]?.text || ''}
              onReplaceUnknowns={handleReplaceUnknowns}
              onRegenerateContract={handleRegenerateContract}
              isReplacingUnknowns={isReplacingUnknowns}
              isRegenerating={isRegenerating}
            />
          </div>

          {/* Sign Button - Fixed at Bottom */}
          <div className="flex-shrink-0">
            <button
              onClick={() => {
                router.push(`/contracts/${contractId}/sign`);
              }}
              className="w-full py-4 text-white rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg bg-black  flex items-center justify-center text-lg font-medium"
            >
              Sign →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}