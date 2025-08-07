"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

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
  onNewChat: () => void;
  contractText: string;
  onReplaceUnknowns: (replacements: Record<string, string>, dismissedUnknowns: string[]) => void;
  isReplacingUnknowns: boolean;
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
  onNewChat,
  contractText,
  onReplaceUnknowns,
  isReplacingUnknowns,
  onRegenerateContract,
  isRegenerating
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const contractId = params.id as string;
  const [isUnknownsPanelExpanded, setIsUnknownsPanelExpanded] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

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
        <h3 className="text-lg font-semibold text-gray-900">Contract Agent</h3>
        <button
          onClick={onNewChat}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          New Chat
        </button>
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
        <div className="flex space-x-2">
          {/* Spacer so that unknown panel is aligned with the input */}
          <button
            className="px-4 bg-white text-white"
          >
            Send
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            placeholder="Ask to change your contract..."
            disabled={isProcessingChatMessage}
            className={`flex-1 p-3 border border-gray-300 disabled:opacity-50 ${
              isUnknownsPanelExpanded 
                ? 'rounded-tr-none rounded-br-lg rounded-bl-lg' 
                : 'rounded-tr-lg rounded-br-lg rounded-bl-lg'
            }`}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isProcessingChatMessage}
            className="px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-900  transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}