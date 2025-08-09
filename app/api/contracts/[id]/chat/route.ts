import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Chat from '@/models/Chat';
import Contract from '@/models/Contract';

// GET - Load chat messages for a contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: contractId } = await params;
    
    // Verify contract exists
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Find or create chat for this contract
    let chat = await Chat.findOne({ contractId });
    
    if (!chat) {
      // Create new chat with simple welcome message - no AI generation needed
      chat = await Chat.create({
        contractId,
        messages: [
          {
            role: 'assistant',
            content: "Hello! I'm here to help you with your contract. Please let me know what you'd like to improve or add.",
            timestamp: new Date()
          }
        ]
      });
    }

    return NextResponse.json({ messages: chat.messages });
  } catch (error) {
    console.error('Error loading chat:', error);
    return NextResponse.json(
      { error: 'Failed to load chat' },
      { status: 500 }
    );
  }
}

// POST - Add a new message to the chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: contractId } = await params;
    const { message, response } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Find or create chat for this contract
    let chat = await Chat.findOne({ contractId });
    
    if (!chat) {
      chat = await Chat.create({
        contractId,
        messages: []
      });
    }

    // Add user message
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Add assistant response if provided
    if (response) {
      chat.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });
    }

    await chat.save();

    return NextResponse.json({ 
      messages: chat.messages,
      success: true 
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}

// DELETE - Clear chat messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id: contractId } = await params;
    
    // Find chat and clear messages
    const chat = await Chat.findOne({ contractId });
    
    if (chat) {
      chat.messages = [];
      await chat.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat' },
      { status: 500 }
    );
  }
} 