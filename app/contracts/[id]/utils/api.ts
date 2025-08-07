import { ContractJson } from '../types/contract';

export const contractApi = {
  async fetchContract(id: string) {
    const response = await fetch(`/api/contracts/${id}`);
    if (!response.ok) throw new Error('Failed to fetch contract');
    return response.json();
  },

  async updateContract(id: string, data: any) {
    const response = await fetch(`/api/contracts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update contract');
    return response.json();
  },

  async sendContract(id: string, contractJson: ContractJson, recipientEmail: string) {
    const response = await fetch(`/api/contracts/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractJson, recipientEmail }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send contract');
    }
    return response.json();
  },

  async generatePDF(id: string, contractJson: ContractJson) {
    const response = await fetch(`/api/contracts/${id}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractJson }),
    });
    if (!response.ok) throw new Error('Failed to generate PDF');
    return response.blob();
  },

  async regenerateBlock(contractJson: ContractJson, blockIndex: number, userPrompt: string) {
    const response = await fetch("/api/regenerateBlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractJson, blockIndex, userPrompt }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to regenerate block");
    }
    return response.json();
  }
};

export const chatApi = {
  async sendMessage(message: string, contractJson: ContractJson, chatHistory: any[], options?: any) {
    // Use the main AI SDK chat endpoint with proper format
    const messages = [
      {
        role: 'system',
        content: `You are a professional contract assistant helping with this contract: ${contractJson.title || 'Untitled Contract'}

Contract context: ${JSON.stringify(contractJson, null, 2)}

Your role is to help analyze, improve, and answer questions about this contract.`
      },
      ...chatHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send chat message: ${errorText}`);
    }
    
    // For now, let's handle this as a simple JSON response
    // The AI SDK streaming should work, but we need to extract the final response
    try {
      const data = await response.json();
      return { response: data.content || data.message || 'I received your message and will help you with the contract.' };
    } catch (jsonError) {
      // If it's not JSON, try to read as text and extract meaningful content
      const text = await response.text();
      return { response: text || 'I received your message and will help you with the contract.' };
    }
  },

  async regenerateContract(contractJson: ContractJson, userPrompt: string) {
    const response = await fetch("/api/regenerateContract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractJson, userPrompt }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to regenerate contract');
    }
    return response.json();
  }
};