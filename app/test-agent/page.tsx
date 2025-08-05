'use client';

import { useState } from 'react';

export default function TestAgentPage() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const testHealthCheck = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/test-agent');
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testStreaming = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    try {
      setIsStreaming(true);
      setResponse('');

      const res = await fetch('/api/contracts/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          streaming: true 
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let fullResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text-delta') {
                fullResponse += data.text;
                setResponse(fullResponse);
              } else if (data.type === 'tool-call') {
                fullResponse += `\n\n[TOOL CALL: ${data.toolName}]\n`;
                setResponse(fullResponse);
              } else if (data.type === 'tool-result') {
                fullResponse += `[TOOL RESULT: ${JSON.stringify(data.output)}]\n\n`;
                setResponse(fullResponse);
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      setResponse(`Streaming Error: ${error}`);
    } finally {
      setIsStreaming(false);
    }
  };

  const testNonStreaming = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/test-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          streaming: false 
        }),
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          AI SDK Agent Testing
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Health Check</h2>
          <button
            onClick={testHealthCheck}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Checking...' : 'Test Agent Health'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Contract Generation Test</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Try: 'Create a service agreement between ABC Corp and John Smith for website development. $5,000 payment, 6-week timeline.' or 'Format the text hello world in uppercase and generate a title for a service agreement'"
            />
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={testStreaming}
              disabled={isStreaming || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isStreaming ? 'Streaming...' : 'Test Streaming Generation'}
            </button>
            
            <button
              onClick={testNonStreaming}
              disabled={isStreaming || isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Test Non-Streaming'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Response</h2>
          <div className="bg-gray-100 p-4 rounded-md min-h-32 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm">
              {response || 'No response yet...'}
            </pre>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
          <h3 className="text-lg font-medium text-blue-800 mb-2">Testing Instructions</h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-1">
            <li>First, click "Test Agent Health" to verify everything is working</li>
            <li>Enter a test prompt (try the examples in the placeholder)</li>
            <li>Click "Test Streaming Generation" to see real-time streaming</li>
            <li>Watch for tool calls and results in the response</li>
            <li>Test "Non-Streaming" to compare the difference</li>
          </ol>
        </div>
      </div>
    </div>
  );
}