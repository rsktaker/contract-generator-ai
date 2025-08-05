// models/Chat.ts
import mongoose, { Document, Model } from 'mongoose';

interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface IChat extends Document {
  contractId: mongoose.Types.ObjectId;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new mongoose.Schema<IChatMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ChatSchema = new mongoose.Schema<IChat>({
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true,
    index: true
  },
  messages: [ChatMessageSchema]
}, {
  timestamps: true
});

export default (mongoose.models.Chat as Model<IChat>) || mongoose.model<IChat>('Chat', ChatSchema); 