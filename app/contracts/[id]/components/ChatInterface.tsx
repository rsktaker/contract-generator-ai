"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerClose 
} from '@/components/ui/drawer';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  chatMessages: ChatMessage[];
  isGeneratingInitialMessage: boolean;
  isProcessingChatMessage: boolean;
  newMessage: string;
  onNewMessageChange: (message: string) => void;
  onSendMessage: (message: string) => void;
  contractText: string;
  onRegenerateContract: (userInstructions: string) => void;
  isRegenerating: boolean;
}

export function ChatInterface({
  chatMessages,
  isGeneratingInitialMessage,
  isProcessingChatMessage,
  newMessage,
  onNewMessageChange,
  onSendMessage,
  contractText,
  onRegenerateContract,
  isRegenerating
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const contractId = params.id as string;
  const [showPastChats, setShowPastChats] = useState(false);
  const [pastChats, setPastChats] = useState<any[]>([]);
  const [loadingPastChats, setLoadingPastChats] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const fetchPastChats = async () => {
    if (!session?.user?.id) return;
    
    setLoadingPastChats(true);
    try {
      const response = await fetch('/api/contracts');
      if (response.ok) {
        const data = await response.json();
        setPastChats(data.contracts || []);
      }
    } catch (error) {
      console.error('Error fetching past chats:', error);
    } finally {
      setLoadingPastChats(false);
    }
  };

  useEffect(() => {
    if (showPastChats && session?.user?.id) {
      fetchPastChats();
    }
  }, [showPastChats, session?.user?.id]);

  const handleNewChat = () => {
    router.push('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !isProcessingChatMessage) {
      onSendMessage(newMessage.trim());
      // Clear the input field immediately
      onNewMessageChange('');
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 mr-4 ml-4 mt-1">
        <div></div> {/* Spacer for centering */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPastChats(true)}
            className="text-sm text-gray-600 hover:text-gray-800 hover:underline font-medium"
          >
            Past Chats
          </button>
          <button
            onClick={() => router.push('/help')}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            FAQs
          </button>
          <button
            onClick={handleNewChat}
            className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
            title="New Chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isGeneratingInitialMessage ? (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading chat...</span>
          </div>
        ) : (
          chatMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}

        {(isProcessingChatMessage || isRegenerating) && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>{isRegenerating ? 'Regenerating...' : 'Thinking...'}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 pt-0">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            placeholder="Ask to change your contract..."
            disabled={isProcessingChatMessage}
            className="flex-1 p-3 border border-gray-300 rounded-lg disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isProcessingChatMessage}
            className="px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            Send
          </button>
        </form>
      </div>

      {/* Past Chats Modal */}
      <Drawer open={showPastChats} onOpenChange={setShowPastChats}>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle>Past Chats</DrawerTitle>
              <DrawerClose className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </DrawerClose>
            </div>
          </DrawerHeader>
          
          <div className="p-4 max-h-96 overflow-y-auto">
            {!session ? (
              // Not authenticated - show login button
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to view your past chats</h3>
                <p className="text-gray-600 mb-4">Keep track of all your contract conversations and easily continue where you left off.</p>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </button>
              </div>
            ) : loadingPastChats ? (
              // Loading state
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                <span className="ml-2 text-gray-600">Loading your chats...</span>
              </div>
            ) : pastChats.length === 0 ? (
              // No chats found
              <div className="text-center text-gray-500 text-sm py-8">
                No past conversations found. Start chatting to see your history here!
              </div>
            ) : (
              // Show past chats
              <div className="space-y-2">
                {pastChats.map((contract) => (
                  <div 
                    key={contract._id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      router.push(`/contracts/${contract._id}`);
                      setShowPastChats(false);
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900">{contract.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(contract.createdAt).toLocaleDateString()} • {contract.type.toUpperCase()} Contract
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}